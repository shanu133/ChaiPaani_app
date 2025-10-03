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
        redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL || 'https://your-production-domain.com'
      }
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
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

      // Get pending invitations for this group
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select('id, invitee_email, status, created_at, token')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      if (invitationsError) {
        console.warn('Could not fetch invitations:', invitationsError)
      }

      // Add invitations to the group data as pseudo-members
      const pendingMembers = (invitations || []).map(invitation => ({
        id: `invitation-${invitation.id}`,
        user_id: null,
        role: 'member',
        joined_at: invitation.created_at,
        status: 'pending',
        email: invitation.invitee_email,
        profiles: null,
        invitation: invitation
      }))

      // Combine real members with pending invitations
      const allMembers = [
        ...(groupData.group_members || []).map(member => ({
          ...member,
          status: 'active'
        })),
        ...pendingMembers
      ]

      return {
        data: {
          ...groupData,
          group_members: allMembers
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
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

    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return { data: null, error: { message: 'User is not a member of this group' } }
    }

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
      return { data: null, error: expenseError }
    }

    // Create the expense splits
    const splitsData = splits.map(split => ({
      expense_id: expense.id,
      user_id: split.user_id,
      amount: split.amount
    }))

    const { data: splitsResult, error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splitsData)
      .select()

    if (splitsError) {
      // If splits fail, we should probably delete the expense, but for now just return error
      return { data: null, error: splitsError }
    }

    return { data: expense, error: null }
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

        balanceData?.forEach(split => {
          if (!split.is_settled) {
            if (split.expenses.payer_id === user.id) {
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

    // Find unsettled expense splits that can be settled (join-safe selection)
    const { data: splitsToSettle, error: fetchError } = await supabase
      .from('expense_splits')
      .select('id, amount, expense_id, is_settled')
      .eq('user_id', fromUserId)
      .eq('is_settled', false)
      .order('created_at', { ascending: true })

    if (fetchError) return { data: null, error: fetchError }

    // For each split, fetch the expense minimal details (payer_id, group_id) separately
    let remainingAmount = amount
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
        const settleAmount = Math.min(split.amount, remainingAmount)

        // Verify user can settle this split (either the payer or the one who owes)
        if (exp.payer_id !== user.id && fromUserId !== user.id) {
          console.error(`User cannot settle split ${split.id}`)
          continue
        }

        // Update the expense split directly
        const { error: settleError } = await supabase
          .from('expense_splits')
          .update({
            is_settled: true,
            settled_at: new Date().toISOString()
          })
          .eq('id', split.id)

        if (settleError) {
          console.error(`Error settling split ${split.id}:`, settleError)
          continue
        }
        settledSplits.push(split.id)
        remainingAmount -= settleAmount
      }
    }

    return {
      data: {
        settled_splits: settledSplits,
        remaining_amount: remainingAmount
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

      // Try Edge Function for email delivery (optional)
      try {
        await supabase.functions.invoke('invite-user', {
          body: { groupId, email, token: invitation.token }
        })
      } catch (emailError) {
        console.warn('Email delivery failed, but invitation created:', emailError)
      }

      return { data: { ok: true, token: invitation.token }, error: null }
    } catch (error) {
      console.error('Error in inviteUser:', error)
      return { data: null, error }
    }
  },
  acceptByToken: async (token: string) => {
    try {
      // Use the SECURITY DEFINER RPC function to accept invitation
      const { data: rpcData, error: rpcError } = await supabase.rpc('accept_group_invitation', {
        p_token: token
      })

      if (rpcError) {
        console.error('RPC error accepting invitation:', rpcError)
        return { data: null, error: rpcError }
      }

      if (!rpcData?.success) {
        const errorMessage = rpcData?.error || rpcData?.message || 'Failed to accept invitation'
        return { data: null, error: { message: errorMessage } }
      }

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