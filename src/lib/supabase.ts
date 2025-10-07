import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Soft-fail diagnostics to avoid white screen on fresh imports/deploys.
export const envDiagnostics = {
  missing: [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean) as string[]
}

if (envDiagnostics.missing.length > 0) {
  // Do not throw at import-time; log a clear diagnostic instead.
  // Calls will fail fast until env is set, but the app can render and guide the user.
  // Provide an obviously-invalid URL to avoid accidental requests to a real host.
  // eslint-disable-next-line no-console
  console.error(
    `Supabase env missing: ${envDiagnostics.missing.join(', ')}. ` +
    `Set these in your environment (e.g., .env.local, Vercel project env) before using backend features.`
  )
}

const resolvedUrl = supabaseUrl || 'https://env-missing.invalid'
const resolvedAnonKey = supabaseAnonKey || 'env-missing-anon-key'

export const supabase = createClient(resolvedUrl, resolvedAnonKey)

// Type definitions
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          display_name: string | null // Ensure this field exists in your Supabase 'profiles' table schema
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          category: string
          image_url: string | null
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          category?: string
          image_url?: string | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          category?: string
          image_url?: string | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          payer_id: string
          description: string
          amount: number
          category: string
          notes: string | null
          receipt_url: string | null
          expense_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          payer_id: string
          description: string
          amount: number
          category?: string
          notes?: string | null
          receipt_url?: string | null
          expense_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          payer_id?: string
          description?: string
          amount?: number
          category?: string
          notes?: string | null
          receipt_url?: string | null
          expense_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount: number
          is_settled: boolean
          settled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          amount: number
          is_settled?: boolean
          settled_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          amount?: number
          is_settled?: boolean
          settled_at?: string | null
          created_at?: string
        }
      }
      settlements: {
        Row: {
          id: string
          group_id: string
          payer_id: string
          receiver_id: string
          amount: number
          description: string | null
          settled_at: string
        }
        Insert: {
          id?: string
          group_id: string
          payer_id: string
          receiver_id: string
          amount: number
          description?: string | null
          settled_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          payer_id?: string
          receiver_id?: string
          amount?: number
          description?: string | null
          settled_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          group_id: string
          inviter_id: string
          invitee_email: string
          status: string
          token: string
          created_at: string
          accepted_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          inviter_id: string
          invitee_email: string
          status?: string
          token?: string
          created_at?: string
          accepted_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          inviter_id?: string
          invitee_email?: string
          status?: string
          token?: string
          created_at?: string
          accepted_at?: string | null
          expires_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
          metadata: any
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          is_read?: boolean
          created_at?: string
          metadata?: any
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          created_at?: string
          metadata?: any
        }
      }
    }
  }
}