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
        redirectTo: window.location.origin
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
    const { data, error } = await supabase
      .from('groups')
      .insert([{ name, description, category }])
      .select()
      .single()

    if (data && !error) {
      const user = await authService.getCurrentUser()
      if (user) {
        await supabase
          .from('group_members')
          .insert([{ group_id: data.id, user_id: user.id, role: 'admin' }])
      }
    }

    return { data, error }
  },

  getUserGroups: async () => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id, role),
        expenses(id)
      `)
      .order('created_at', { ascending: false })

    return { data, error }
  },

  getGroupDetails: async (groupId: string) => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members(
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

    const { data, error } = await supabase.rpc('create_expense_with_splits', {
      p_group_id: groupId,
      p_description: description,
      p_amount: amount,
      p_category: category,
      p_notes: notes,
      p_splits: splits
    })

    return { data, error }
  },

  getRecentExpenses: async (limit: number = 20) => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        payer:profiles!payer_id(full_name, avatar_url),
        group:groups!group_id(name),
        expense_splits(
          amount,
          user:profiles!user_id(full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  getUserBalance: async (groupId?: string) => {
    if (groupId) {
      const { data, error } = await supabase.rpc('get_user_balance_in_group', {
        p_group_id: groupId
      })
      return { data: data?.[0], error }
    }

    // Get overall balance across all groups
    const user = await authService.getCurrentUser()
    if (!user) return { data: null, error: { message: 'User not authenticated' } }

    const { data, error } = await supabase
      .from('expense_splits')
      .select(`
        amount,
        expense:expenses!inner(
          payer_id,
          group:groups!inner(
            group_members!inner(user_id)
          )
        )
      `)
      .eq('user_id', user.id)

    return { data, error }
  }
}