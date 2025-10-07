import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  groupId: string
  email: string
}

interface ResponseBody {
  ok: boolean
  token?: string
  error?: string
}

// CORS headers object for reuse
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }

  try {
    const { groupId, email }: RequestBody = await req.json()

    if (!groupId || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing groupId or email' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create Supabase client with user JWT for RLS operations
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'No authorization header' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Step 1: Call RPC to create invitation (RLS checks creator)
    const { data: rpcData, error: rpcError } = await supabaseUser.rpc('invite_user_to_group', {
      p_group_id: groupId,
      p_invitee_email: email
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return new Response(JSON.stringify({ ok: false, error: rpcError.message }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    // Handle new RPC response format
    if (!rpcData?.success) {
      const errorMessage = rpcData?.error || rpcData?.message || 'Failed to create invitation'
      return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    const token = rpcData?.token
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to generate invitation token' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    // Step 2: Send email invite via admin API (non-blocking)
    try {
      const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          group_invitation_token: token,
          invited_to_group: groupId
        },
        redirectTo: `${Deno.env.get('FRONTEND_URL')}/auth/callback#token=${token}`
      })

      if (emailError) {
        console.warn('Email send failed:', emailError)
        // Don't fail the request, just log the warning
      }
    } catch (emailException) {
      console.warn('Email exception:', emailException)
      // Continue without failing
    }

    // Return success with token for in-app tracking
    const response: ResponseBody = { ok: true, token }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
})