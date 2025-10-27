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
        redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL || (() => {
          if (typeof window !== 'undefined') return window.location.origin
          throw new Error('VITE_SUPABASE_REDIRECT_URL must be configured')
        })()      }
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
      // Normalize common membership errors
      const msg = (expenseError.message || '').toLowerCase()
      if (msg.includes('not a member') || msg.includes('permission denied') || msg.includes('rls')) {
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
      // Cleanup orphaned expense
      await supabase.from('expenses').delete().eq('id', expense.id)
      return { data: null, error: splitsError }
    }

    // Send email notifications asynchronously (don't wait or fail if it errors)
    try {
      const enableEmailNotifications = (import.meta as any).env?.VITE_ENABLE_EXPENSE_EMAILS !== 'false'
      
      if (enableEmailNotifications) {
        // Call the notify-expense Edge function asynchronously
        supabase.functions.invoke('notify-expense', {
          body: {
            expense_id: expense.id,
            group_id: groupId,
            payer_id: user.id,
            description,
            amount,
            category
          }
        }).then(({ error: notifyError }) => {
          if (notifyError) {
            console.warn('Failed to send expense email notifications:', notifyError)
          }
        }).catch((err) => {
          console.warn('Exception sending expense email notifications:', err)
        })
      }
    } catch (err) {
      // Ignore email notification errors - the expense was created successfully
      console.warn('Failed to trigger expense email notifications:', err)
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
  
      // Phase 1: Get recent expenses (minimal columns)
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, description, amount, category, created_at, payer_id, group_id')
        .or(`payer_id.eq.${user.id},expense_splits.user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit)
  
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError)
        return { data: [], error: expensesError }
      }
  
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
      const msg = (error.message || '').toLowerCase()
      const isMissing = (error as any)?.status === 404 || msg.includes('not found') || msg.includes('does not exist')
      if (!isMissing) {
        return { data: null, error }
      }

      // Fallback path: perform client-side settle if RPC isn't available yet
      try {
        // Find unsettled expense splits that can be settled (join-safe selection)
        const { data: splitsToSettle, error: fetchError } = await supabase
          .from('expense_splits')
          .select('id, amount, expense_id, is_settled')
          .eq('user_id', fromUserId)
          .eq('is_settled', false)
          .order('created_at', { ascending: true })

        if (fetchError) return { data: null, error: fetchError }

        let remainingAmount = amount
        let totalSettled = 0
        const settledSplits: string[] = []

        for (const split of splitsToSettle || []) {
          if (remainingAmount <= 0) break
          const { data: exp, error: expErr } = await supabase
            .from('expenses')
            .select('id, payer_id, group_id')
            .eq('id', split.expense_id)
            .single()

          if (expErr || !exp) continue
          if (exp.payer_id === toUserId && exp.group_id === groupId) {
            // Only settle full splits to avoid marking partially-paid splits as settled
            if (remainingAmount >= (split as any).amount) {
              // Verify user can settle this split (either the payer or the one who owes)
              if (exp.payer_id !== user.id && fromUserId !== user.id) {
                continue
              }

              const { error: settleError } = await supabase
                .from('expense_splits')
                .update({
                  is_settled: true,
                  settled_at: new Date().toISOString()
                })
                .eq('id', (split as any).id)

              if (settleError) continue
              settledSplits.push((split as any).id)
              remainingAmount -= (split as any).amount
              totalSettled += (split as any).amount
            } else {
              break
            }
          }
        }

        if (totalSettled > 0) {
          await supabase
            .from('settlements')
            .insert({
              group_id: groupId,
              payer_id: fromUserId,
              receiver_id: toUserId,
              amount: totalSettled,
              description: 'Settle up'
            })
        }

        return {
          data: {
            settled_splits: settledSplits,
            settled_amount: totalSettled,
            remaining_amount: remainingAmount
          },
          error: null
        }
      } catch (e: any) {
        return { data: null, error: { message: e?.message || 'Fallback settle failed' } }
      }
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

      // Email delivery path
      const enableSmtp = import.meta.env.VITE_ENABLE_SMTP === 'true'
      const enableLegacyInvite = import.meta.env.VITE_ENABLE_INVITE_EMAIL === 'true'
      
      console.log('🔔 Email notification settings:', { enableSmtp, enableLegacyInvite })
      
      // Try SMTP first if enabled, else fall back to legacy edge invite function
      if (enableSmtp) {
        try {
          console.log('📧 Attempting to send invitation email via SMTP to:', email)
          
          // Fetch inviter's profile and group details for a personalized email
          const user = await authService.getCurrentUser()
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('full_name, display_name, email')
            .eq('id', user?.id)
            .single()
          
          const { data: groupData } = await supabase
            .from('groups')
            .select('name')
            .eq('id', groupId)
            .single()

          const inviterName = inviterProfile?.display_name || inviterProfile?.full_name || inviterProfile?.email?.split('@')[0] || 'Someone'
          const groupName = groupData?.name || 'a group'

          // Build email link base: prefer explicit VITE_EMAIL_LINK_BASE, else VITE_PUBLIC_APP_URL, else window origin
          const emailLinkBase = (((import.meta as any).env?.VITE_EMAIL_LINK_BASE || (import.meta as any).env?.VITE_PUBLIC_APP_URL) as string | undefined)?.replace(/\/$/, '') || ''
          const base = emailLinkBase || ((typeof window !== 'undefined' ? window.location.origin : '') || '').replace(/\/$/, '')
          const inviteUrl = `${base}/#token=${encodeURIComponent(invitation.token)}`
          const title = `You're invited to join ${groupName} on ChaiPaani`
          const logoUrl = (import.meta as any).env?.VITE_PUBLIC_LOGO_URL || 'https://edwjkqbrvcoqsrfxqtyu.supabase.co/storage/v1/object/public/public-assets/email_banner.png'
          const mottoPrimary = 'Splitting bills is easy as making chai'
          const mottoSecondary = 'Split bills with friends, effortlessly'
          const footerLine = 'Making bill splitting simple and fun.'
          
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${title}</title>
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with logo -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; text-align: center;">
                  <img src="${logoUrl}" alt="ChaiPaani Logo" style="width: 60px; height: auto; margin-bottom: 12px; border-radius: 50%;">
                  <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 600;">ChaiPaani</h1>
                  <div style="background: #1e293b; display: inline-block; border-radius: 6px; padding: 6px 18px; margin-top: 10px;">
                    <span style="color: #bfdbfe; font-size: 15px; font-weight: 500; letter-spacing: 0.2px;">${mottoPrimary}</span>
                  </div>
                  <p style="color: #e0e7ff; font-size: 14px; margin: 8px 0 0 0; font-weight: 400;">${mottoSecondary}</p>
                </div>
                
                <!-- Main content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">You're Invited! 🎉</h2>
                  
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello!</p>
                  
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    <strong style="color: #1e293b;">${inviterName}</strong> has invited you to join the group 
                    "<strong style="color: #3b82f6;">${groupName}</strong>" on ChaiPaani.
                  </p>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Accept Invitation
                    </a>
                  </div>
                  
                  <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Having trouble with the button? Copy and paste this link:</p>
                    <p style="color: #3b82f6; font-size: 13px; margin: 0; word-break: break-all; font-family: monospace;">${inviteUrl}</p>
                  </div>
                  
                  <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
                    Join us and make splitting bills simple and fun! 💰
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">&copy; 2025 ChaiPaani. ${footerLine}</p>
                  <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
                
              </div>
            </body>
            </html>
          `
          
          // NOTE: The Supabase client SDK does not provide server-side-only
          // helpers like `inviteUserByEmail` in the browser. Instead we use our
          // Edge function `smtp-send` to deliver invitation emails. The code
          // below (invoking the `smtp-send` Edge function) will handle delivery.
        } catch (emailError) {
          console.error('❌ SMTP email delivery failed, invitation still created:', emailError)
        }
      } else if (enableLegacyInvite) {
        try {
          console.log('📧 Using legacy invite-user function for:', email)
          await supabase.functions.invoke('invite-user', {
            body: { groupId, email, token: invitation.token }
          })
        } catch (emailError) {
          console.warn('Legacy email delivery failed (or CORS), but invitation created:', emailError)
        }
      } else {
        console.warn('⚠️ No email notification method enabled! Set VITE_ENABLE_SMTP=true or VITE_ENABLE_INVITE_EMAIL=true')
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

    // Fetch the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('token, status, invitee_email')
      .eq('id', inviteId)
      .single()

    if (fetchError || !invitation) {
      return { data: null, error: fetchError || { message: 'Invitation not found' } }
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
  },
  resendInvite: async (groupId: string, email: string) => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return { data: null, error: { message: 'User not authenticated' } }

      // Verify caller is group creator/admin
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('created_by, name') // Also fetch group name
        .eq('id', groupId)
        .single()
      
      if (groupError) return { data: null, error: groupError }
      if (group.created_by !== user.id) return { data: null, error: { message: 'Only group creator can resend invitations' } }

      // Look up pending invite for this email
      const { data: invites, error } = await supabase
        .from('invitations')
        .select('token, status')
        .eq('group_id', groupId)
        .eq('invitee_email', email.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) return { data: null, error }
      const invite = invites?.[0]
      if (!invite || invite.status !== 'pending') {
        return { data: null, error: { message: 'No pending invitation found for this email' } }
      }

      // --- Start: Use new professional email template ---
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, display_name, email')
        .eq('id', user.id)
        .single()

      const inviterName = inviterProfile?.display_name || inviterProfile?.full_name || inviterProfile?.email?.split('@')[0] || 'Someone'
      const groupName = group.name || 'a group'

      // Build email link base for resend as well
      const emailLinkBase2 = (((import.meta as any).env?.VITE_EMAIL_LINK_BASE || (import.meta as any).env?.VITE_PUBLIC_APP_URL) as string | undefined)?.replace(/\/$/, '') || ''
      const base = emailLinkBase2 || ((typeof window !== 'undefined' ? window.location.origin : '') || '').replace(/\/$/, '')
      const inviteUrl = `${base}/#token=${encodeURIComponent(invite.token)}`
  const title = `Reminder: You're invited to join ${groupName} on ChaiPaani`
  const logoUrl = (import.meta as any).env?.VITE_PUBLIC_LOGO_URL || 'https://edwjkqbrvcoqsrfxqtyu.supabase.co/storage/v1/object/public/public-assets/email_banner.png'
  const mottoPrimary = 'Splitting bills is easy as making chai'
  const mottoSecondary = 'Split bills with friends, effortlessly'
  const footerLine = 'Making bill splitting simple and fun.'
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with logo -->
            <div style="background: #0f172a; padding: 0; text-align: center;">
              <img src="${logoUrl}" alt="ChaiPaani" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto;">
              <div style="padding: 16px 20px;">
                <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 600;">ChaiPaani</h1>
                <div style="background: #1e293b; display: inline-block; border-radius: 6px; padding: 6px 18px; margin-top: 10px;">
                  <span style="color: #bfdbfe; font-size: 15px; font-weight: 500; letter-spacing: 0.2px;">${mottoPrimary}</span>
                </div>
                <p style="color: #e0e7ff; font-size: 14px; margin: 8px 0 0 0; font-weight: 400;">${mottoSecondary}</p>
              </div>
            </div>
            
            <!-- Main content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Invitation Reminder 📬</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello!</p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                This is a friendly reminder that <strong style="color: #1e293b;">${inviterName}</strong> invited you to join the group 
                "<strong style="color: #3b82f6;">${groupName}</strong>" on ChaiPaani.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                  Accept Invitation
                </a>
              </div>
              
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Having trouble with the button? Copy and paste this link:</p>
                <p style="color: #3b82f6; font-size: 13px; margin: 0; word-break: break-all; font-family: monospace;">${inviteUrl}</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">&copy; 2025 ChaiPaani. ${footerLine}</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
      // --- End: Use new professional email template ---

  const text = `ChaiPaani\n${mottoPrimary}\n${mottoSecondary}\n\nReminder: ${inviterName} invited you to join "${groupName}" on ChaiPaani.\nAccept: ${inviteUrl}\n\n${footerLine}`
      const forceTextOnly = (import.meta as any).env?.VITE_FORCE_PLAINTEXT_EMAILS === 'true'
      const forceHtmlOnly = (import.meta as any).env?.VITE_FORCE_HTML_ONLY_EMAILS === 'true'
      const htmlToSend = forceTextOnly ? undefined : html
      const textToSend = forceHtmlOnly ? undefined : text
      const { data, error: sendErr } = await supabase.functions.invoke('smtp-send', {
        body: { to: email.toLowerCase(), subject: title, html: htmlToSend, text: textToSend, inlineLogoUrl: logoUrl, groupName, inviterName }
      })
      console.log('Edge Function invoke result:', { data, sendErr })
      if (sendErr) return { data: null, error: sendErr }
      if (!data?.ok) return { data: null, error: { message: data?.error || 'Failed to send email' } as any }
      return { data: { ok: true }, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

// Profiles join-safe helpers
export const profileService = {
  getCurrentProfile: async () => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, email, avatar_url, phone')
      .eq('id', user.id)
      .single()
    return { data, error }
  },
  updateProfile: async (updates: { display_name?: string; phone?: string }) => {
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }
    
    // Build update object with only provided fields
    const updateData: any = {}
    if (updates.display_name !== undefined) updateData.display_name = updates.display_name
    if (updates.phone !== undefined) updateData.phone = updates.phone
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('id, display_name, phone')
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