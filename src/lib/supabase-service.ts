import { supabase } from './supabase'

export const authService = {
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin
      }
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (err: any) {
      // Fallback: if network/CORS blocks getUser, try local session
      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession()
        if (sessErr) throw sessErr
        return session?.user || null
      } catch (e) {
        return null
      }
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const groupService = {
  createGroup: async (name: string, description: string, category: string = 'general') => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    // Ensure created_by is set to the current user's ID
    const { data, error } = await supabase
      .from('groups')
      .insert([{ 
        name, 
        description, 
        category, 
        created_by: user.id,
        currency: 'INR' // Default currency
      }])
      .select()
      .single()

    if (data && !error) {
      // Insert creator as admin member (RLS should allow this)
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{ 
          group_id: data.id, 
          user_id: user.id, 
          role: 'admin',
          joined_at: new Date().toISOString()
        }])

      if (memberError) {
        console.error('Could not add creator as admin member:', memberError)
        // Don't fail the group creation, just log the error
      }
    }

    return { data, error }
  },
  updateGroup: async (id: string, name: string, description: string, category: string = 'general') => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    const { data, error } = await supabase
      .from('groups')
      .update({
        name,
        description,
        category,
      })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  getUserGroups: async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { data: null, error: userError || { message: 'User not authenticated' } }
      }

      // Phase 1: Get groups created by user (minimal columns)
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('id, name, description, created_by, category, currency, created_at, updated_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (createdError) {
        return { data: null, error: createdError }
      }

      // Phase 2: Get group IDs where user is a member (separate query to avoid JOIN)
      const { data: memberGroupIds, error: memberIdsError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id)

      if (memberIdsError) {
        console.warn('Could not fetch member group IDs:', memberIdsError)
      }

      // Phase 3: Get member groups by IDs (minimal columns, separate query)
      let memberGroups: any[] = []
      if (memberGroupIds && memberGroupIds.length > 0) {
        const groupIds = memberGroupIds.map(m => m.group_id)
        const { data: memberGroupsData, error: memberGroupsError } = await supabase
          .from('groups')
          .select('id, name, description, created_by, category, currency, created_at, updated_at')
          .in('id', groupIds)
          .order('created_at', { ascending: false })

        if (memberGroupsError) {
          console.warn('Could not fetch member groups:', memberGroupsError)
        } else {
          // Add membership info to member groups
          memberGroups = memberGroupsData?.map(group => {
            const membership = memberGroupIds.find(m => m.group_id === group.id)
            return {
              ...group,
              group_members: membership ? [{
                user_id: user.id,
                role: membership.role
              }] : []
            }
          }) || []
        }
      }

      // Combine and deduplicate groups
      const allGroups = new Map()

      // Add created groups
      createdGroups?.forEach(group => {
        allGroups.set(group.id, {
          ...group,
          group_members: [{
            user_id: user.id,
            role: 'admin' // Creator is admin
          }]
        })
      })

      // Add member groups (skip if already added as creator)
      memberGroups?.forEach(group => {
        if (!allGroups.has(group.id)) {
          allGroups.set(group.id, group)
        }
      })

      // Convert to array and sort by creation date
      const result = Array.from(allGroups.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return { data: result, error: null }
    } catch (error) {
      console.error('Error in getUserGroups:', error)
      return { data: null, error }
    }
  },

  getGroupDetails: async (groupId: string) => {
    try {
      // First get basic group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(
            id,
            user_id,
            role,
            joined_at,
            profiles(id, full_name, avatar_url, email)
          ),
          expenses(
            *,
            payer:profiles!payer_id(full_name, avatar_url),
            expense_splits(
              *,
              user:profiles!user_id(full_name)
            )
          )
        `)
        .eq('id', groupId)
        .single()

      if (groupError) return { data: null, error: groupError }

      // Fetch members + pending invites via RPC (ensures names for pending)
      const { data: memberRows, error: memberErr } = await supabase
        .rpc('get_group_members_with_status', { p_group_id: groupId })

      if (memberErr) {
        console.warn('Could not fetch members via RPC, falling back:', memberErr)
        return { data: groupData, error: null }
      }

      const rpcMembers = (memberRows || []).map((row: any, idx: number) => {
        const isActive = row.status === 'active'
        return {
          id: isActive && row.user_id ? `${row.user_id}` : `invitation-${idx}`,
          user_id: row.user_id,
          role: 'member',
          joined_at: groupData.created_at,
          status: row.status,
          email: row.email,
          profiles: { id: (row.user_id || `pending-${idx}`), full_name: row.display_name, email: row.email },
          invitation: row.source === 'invitation' ? { invitee_email: row.email, status: 'pending' } : null
        }
      })

      return { data: { ...groupData, group_members: rpcMembers }, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
  // Lightweight fetch for Add Expense modal to ensure newly added/accepted members are visible
  getGroupMembersWithStatus: async (groupId: string) => {
    const { data, error } = await supabase.rpc('get_group_members_with_status', { p_group_id: groupId })
    return { data, error }
  },

  addMemberToGroup: async (groupId: string, email: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (profileError) return { data: null, error: profileError }

    const { data, error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: profile.id }])
      .select()

    return { data, error }
  },

  deleteGroup: async (groupId: string) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    // Check if user is the owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (groupError) return { data: null, error: groupError }
    if (group.created_by !== user.id) return { data: null, error: { message: 'Only group owner can delete the group' } }

    // Delete group (cascade will handle related records)
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    return { data: null, error }
  },

  leaveGroup: async (groupId: string) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    // Check if user is the owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (groupError) return { data: null, error: groupError }
    if (group.created_by === user.id) return { data: null, error: { message: 'Group owner cannot leave the group. Transfer ownership or delete the group instead.' } }

    // Remove user from group
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    return { data: null, error }
  },

  transferOwnership: async (groupId: string, newOwnerUserId: string) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    try {
      // Preferred path: RPC handles RLS-sensitive update under SECURITY DEFINER
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('transfer_group_ownership', {
          p_group_id: groupId,
          p_new_owner_id: newOwnerUserId
        })
        if (!rpcError && rpcData && (rpcData.ok || rpcData.success)) {
          return { data: rpcData, error: null }
        }
        // If RPC exists but returned error object, surface it
        if (rpcError && (rpcError as any)?.code !== 'PGRST404') {
          return { data: null, error: rpcError }
        }
      } catch (e) {
        // Ignore and fall back to direct update under RLS if RPC is missing
      }

      // Ensure caller is current owner
      const { data: group, error: fetchErr } = await supabase
        .from('groups')
        .select('id, created_by')
        .eq('id', groupId)
        .single()
      if (fetchErr) return { data: null, error: fetchErr }
      if (!group || group.created_by !== user.id) return { data: null, error: { message: 'Only the current owner can transfer ownership' } }

      // Ensure target user is a member of the group
      const { data: member, error: memberErr } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', newOwnerUserId)
        .single()
      if (memberErr || !member) return { data: null, error: { message: 'Selected user is not a member of this group' } }

      // Perform the transfer
      const { data: updated, error: updateErr } = await supabase
        .from('groups')
        .update({ created_by: newOwnerUserId })
        .eq('id', groupId)
        .select('id, created_by')
        .single()
      if (updateErr) return { data: null, error: updateErr }

      // Optionally elevate the new owner to admin role if roles are used
      await supabase
        .from('group_members')
        .update({ role: 'admin' })
        .eq('group_id', groupId)
        .eq('user_id', newOwnerUserId)

      return { data: updated, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

export const expenseService = {
  createExpense: async (
    groupId: string,
    description: string,
    amount: number,
    category: string,
    notes: string,
    splits: { user_id: string; amount: number }[]
  ) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    // Rely on RLS to enforce membership at insert time (avoids false negatives from RPC visibility)

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        payer_id: user.id,
        description,
        amount,
        category,
        notes
      })
      .select()
      .single()

    if (expenseError) {
      // Prefer structured error properties over brittle message checks
      const code = (expenseError as any)?.code
      const status = (expenseError as any)?.status
      if (code === 'PGRST301' || code === '42501' || status === 403) {
        return { data: null, error: { message: 'User is not a member of this group' } }
      }
      return { data: null, error: expenseError }
    }

    // Create the expense splits
    const splitsData = splits.map(split => ({
      expense_id: expense.id,
      user_id: split.user_id,
      amount: split.amount
    }))
    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splitsData)
      .select()

    if (splitsError) {
      // Clean up the orphaned expense
      await supabase.from('expenses').delete().eq('id', expense.id)
      return { data: null, error: splitsError }
    }

    return { data: expense, error: null }
  },

  // Batched balances for multiple groups using the existing per-group calculator
  getUserBalancesForGroups: async (groupIds: string[]) => {
    try {
      const results = await Promise.all(
        (groupIds || []).map(async (gid) => {
          const { data, error } = await expenseService.getUserBalance(gid)
          if (error || !data || !Array.isArray(data) || data.length === 0) {
            return { group_id: gid, net_balance: 0 }
          }
          // getUserBalance(groupId) returns array with net_balance
          const net = (data[0] as any)?.net_balance ?? 0
          return { group_id: gid, net_balance: Number(net) || 0 }
        })
      )
      return { data: results, error: null as any }
    } catch (error) {
      return { data: [], error }
    }
  },

  // Join-safe, columns-only selection; app composes details
  getRecentExpenses: async (limit: number = 20) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount, category, created_at, payer_id, group_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  // Two-phase fetch for activity: get expenses then compose with groups/profiles
  getActivitySafe: async (limit: number = 20) => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return { data: [], error: { message: 'User not authenticated' } }
  
      // Phase 1a: Get expenses where the user is the payer
      const { data: payerExpenses, error: payerError } = await supabase
        .from('expenses')
        .select('id, description, amount, category, created_at, payer_id, group_id')
        .eq('payer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (payerError) {
        console.error('Error fetching payer expenses:', payerError)
        return { data: [], error: payerError }
      }

      // Phase 1b: Find expenses where the user has splits
      const { data: userSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .select('expense_id')
        .eq('user_id', user.id)
        .limit(limit)

      if (splitsError) {
        console.error('Error fetching user splits:', splitsError)
        return { data: [], error: splitsError }
      }

      const splitExpenseIds = (userSplits || []).map(s => s.expense_id)

      let splitExpenses: any[] = []
      if (splitExpenseIds.length > 0) {
        const { data, error } = await supabase
          .from('expenses')
          .select('id, description, amount, category, created_at, payer_id, group_id')
          .in('id', splitExpenseIds)
          .order('created_at', { ascending: false })

        if (!error) splitExpenses = data || []
      }

      // Merge, dedupe, sort, limit
      const expenseMap = new Map<string, any>()
      ;[...(payerExpenses || []), ...splitExpenses].forEach((exp: any) => {
        expenseMap.set(exp.id, exp)
      })
      const expenses = Array.from(expenseMap.values())
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)

      if (!expenses || expenses.length === 0) {
        return { data: [], error: null }
      }
  
      // Phase 2: Get group details for these expenses
      const groupIds = [...new Set(expenses.map(e => e.group_id))]
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, category')
        .in('id', groupIds)
  
      if (groupsError) {
        console.error('Error fetching groups for activity:', groupsError)
        return { data: [], error: groupsError }
      }
  
      // Phase 3: Get profile details for payers
      const payerIds = [...new Set(expenses.map(e => e.payer_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('id', payerIds)
  
      if (profilesError) {
        console.error('Error fetching profiles for activity:', profilesError)
        return { data: [], error: profilesError }
      }
  
      // Compose the final activity data
      const activity = expenses.map(expense => {
        const group = groups?.find(g => g.id === expense.group_id) || { name: 'Unknown Group', category: 'general' }
        const payer = profiles?.find(p => p.id === expense.payer_id) || { full_name: 'Unknown', display_name: null }
        const payerName = payer.display_name || payer.full_name || 'Unknown'
        const isCurrentUserPayer = expense.payer_id === user.id
  
        return {
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          created_at: expense.created_at,
          group: {
            id: expense.group_id,
            name: group.name,
            category: group.category
          },
          payer: {
            id: expense.payer_id,
            name: payerName,
            isCurrentUser: isCurrentUserPayer
          }
        }
      })
  
      return { data: activity, error: null }
    } catch (error) {
      console.error('Error in getActivitySafe:', error)
      return { data: [], error }
    }
  },

  // Returns overall balance with a safe query for group scoped balance
  getUserBalance: async (groupId?: string) => {
    if (groupId) {
      try {
        const user = await authService.getCurrentUser()
        if (!user) return { data: null, error: { message: 'User not authenticated' } }

        // Verify user is member of the group
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single()

        if (membershipError || !membership) {
          return { data: null, error: { message: 'User is not a member of this group' } }
        }

        // Get balance data using direct queries
        const { data: balanceData, error: balanceError } = await supabase
          .from('expense_splits')
          .select(`
            amount,
            is_settled,
            expenses!inner(
              payer_id,
              group_id
            )
          `)
          .eq('expenses.group_id', groupId)

        if (balanceError) return { data: null, error: balanceError }

        // Calculate balances
        let amountOwed = 0
        let amountOwes = 0

        balanceData?.forEach((split: any) => {
          if (!split.is_settled) {
            const exp = Array.isArray(split.expenses) ? split.expenses[0] : split.expenses;
            const payerId = exp?.payer_id;
            if (payerId === user.id) {
              // Others owe user
              amountOwed += split.amount
            } else {
              // User owes others
              amountOwes += split.amount
            }
          }
        })

        return {
          data: [{
            user_id: user.id,
            amount_owed: amountOwed,
            amount_owes: amountOwes,
            net_balance: amountOwed - amountOwes
          }],
          error: null
        }
      } catch (error) {
        return { data: null, error }
      }
    }

    // Fallback simple overall: sum splits for current user (no joins)
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    const { data, error } = await supabase
      .from('expense_splits')
      .select('amount, expense_id')
      .eq('user_id', user.id)

    return { data, error }
  },

  settleUp: async (fromUserId: string, toUserId: string, amount: number, groupId: string) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    // Delegate to server-side RPC for atomic settle + logging
    const { data, error } = await supabase.rpc('settle_group_debt', {
      p_group_id: groupId,
      p_from_user: fromUserId,
      p_to_user: toUserId,
      p_amount: amount
    })

    if (error) {
      // Prefer structured fields to detect missing RPC, fall back to message matching
      const status = (error as any)?.status
      const code = String((error as any)?.code || '').toUpperCase()
      const structuredMissing = status === 404 || code === '404' || code === 'PGRST404'
      const msg = String((error as any)?.message || '').toLowerCase()
      const details = String((error as any)?.details || '').toLowerCase()
      const hint = String((error as any)?.hint || '').toLowerCase()
      const textMissing = [msg, details, hint].some(t =>
        t.includes('not found') ||
        t.includes('does not exist') ||
        t.includes('could not find')
      )
      const isMissing = structuredMissing || textMissing
      if (isMissing) {
        // RPC not available - settlement requires atomic transaction
        return { data: null, error: { message: 'Settlement feature requires database function setup. Please contact support.' } }
      }
      return { data: null, error }
    }

    return {
      data: {
        settled_splits: data?.settled_splits || [],
        settled_amount: data?.settled_amount || 0,
        remaining_amount: data?.remaining_amount || 0
      },
      error: null
    }
  }
}

// Notifications and invitations (join-safe)
export const notificationService = {
  getBadgeCount: async (): Promise<number> => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return 0

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.warn('badge count error', error)
        return 0
      }
      return count ?? 0
    } catch (error) {
      console.warn('badge count error', error)
      return 0
    }
  },
  getNotifications: async (limit: number = 30) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: [], error: { message: 'User not authenticated' } }
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },
  markRead: async (id: string, isRead = true) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: isRead })
      .eq('id', id)
      .select('id')
    return { data, error }
  }
}

export const invitationService = {
  inviteUser: async (groupId: string, email: string) => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return { data: null, error: { message: 'User not authenticated' } }

      // Check if caller is the group creator (admin)
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single()

      if (groupError) return { data: null, error: groupError }
      if (group.created_by !== user.id) return { data: null, error: { message: 'Only group creator can invite at this time' } }

      // Create invitation directly (RLS policies will handle permissions)
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          group_id: groupId,
          inviter_id: user.id,
          invitee_email: email.toLowerCase()
        })
        .select()
        .single()

      if (inviteError) return { data: null, error: inviteError }

      // Optional: Try Edge Function for email delivery only if enabled
      if ((import.meta as any).env?.VITE_ENABLE_INVITE_EMAIL === 'true') {
        try {
          await supabase.functions.invoke('invite-user', {
            body: { groupId, email, token: invitation.token }
          })
        } catch (emailError) {
          console.warn('Email delivery failed (or CORS), but invitation created:', emailError)
        }
      }

      return { data: { ok: true, token: invitation.token }, error: null }
    } catch (error) {
      console.error('Error in inviteUser:', error)
      return { data: null, error }
    }
  },
  // Fetch pending invitations for a group (join-safe, minimal columns)
  getPendingInvitations: async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, invitee_email, created_at, token, status')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) return { data: null, error }
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
  acceptByToken: async (token: string) => {
    try {
      // Use the updated RPC that accepts UUID tokens and notifies the inviter
      const { data: rpcData, error: rpcError } = await supabase.rpc('accept_group_invitation', { p_token: token })

      if (rpcError) {
        console.error('RPC error accepting invitation:', rpcError)
        return { data: null, error: rpcError }
      }

      if (!rpcData?.success) {
        const errorMessage = rpcData?.error || rpcData?.message || 'Failed to accept invitation'
        return { data: null, error: { message: errorMessage } }
      }

      // RPC returns { success: true, group_id }
      return { data: { ok: true, group_id: rpcData.group_id }, error: null }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      return { data: null, error }
    }
  },
  acceptInviteById: async (inviteId: string) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    // Fetch invitation by id to get token (RLS policy allows if invitee_email matches user's email)
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, token, invitee_email, status')
      .eq('id', inviteId)
      .single()

    if (fetchError) {
      return { data: null, error: fetchError }
    }

    if (!invitation) {
      return { data: null, error: { message: 'Invitation not found' } }
    }

    // Verify the invitation is for the current user
    if (invitation.invitee_email.toLowerCase() !== user.email?.toLowerCase()) {
      return { data: null, error: { message: 'Invitation is not for this user' } }
    }

    if (invitation.status !== 'pending') {
      return { data: null, error: { message: `Invitation is already ${invitation.status}` } }
    }

    // Accept using the token
    return await invitationService.acceptByToken(invitation.token)
  }
}

// Profiles join-safe helpers
export const profileService = {
  getCurrentProfile: async () => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, email, avatar_url')
      .eq('id', user.id)
      .single()
    return { data, error }
  },
  updateDisplayName: async (displayName: string) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)
      .select('id, display_name')
      .single()
    return { data, error }
  }
}