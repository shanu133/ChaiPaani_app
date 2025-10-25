// Edge Function to send email notification when a member is added to a group
// This is different from invitation emails - it's for when someone is directly added

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MemberAddedPayload {
  group_id: string
  member_email: string
  added_by_id: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing required environment variables')
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Parse request body
    const payload: MemberAddedPayload = await req.json()
    const { group_id, member_email, added_by_id } = payload

    if (!group_id || !member_email || !added_by_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('name, category')
      .eq('id', group_id)
      .single()

    if (groupError || !group) {
      console.error('Error fetching group:', groupError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch group details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get adder details
    const { data: adder, error: adderError } = await supabase
      .from('profiles')
      .select('display_name, full_name, email')
      .eq('id', added_by_id)
      .single()

    if (adderError || !adder) {
      console.error('Error fetching adder:', adderError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch adder details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adderName = adder.display_name || adder.full_name || adder.email?.split('@')[0] || 'Someone'

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .ilike('email', member_email)
      .single()

    const memberName = member?.display_name || member?.full_name || member_email.split('@')[0] || 'there'

    const subject = `You've been added to ${group.name}`
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">ChaiPaani</h1>
          <p style="color: #6b7280; margin-top: 5px;">Group Notification</p>
        </div>
        
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">👥 You've been added to a group!</h2>
          
          <div style="background: white; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px;">
              Hi ${memberName},
            </p>
            
            <p style="margin: 0 0 16px 0; color: #374151; line-height: 1.6;">
              <strong>${adderName}</strong> has added you to the group <strong style="color: #3b82f6;">${group.name}</strong>.
            </p>
            
            <p style="margin: 0 0 16px 0; color: #374151; line-height: 1.6;">
              You can now:
            </p>
            
            <ul style="color: #374151; line-height: 1.8; margin: 0 0 16px 0;">
              <li>View and add expenses to the group</li>
              <li>See your balances with other members</li>
              <li>Track who owes what</li>
              <li>Settle up when ready</li>
            </ul>
            
            ${group.category ? `
            <div style="margin-top: 16px;">
              <span style="background: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 12px; font-size: 13px; font-weight: 500;">
                ${group.category}
              </span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${Deno.env.get('VITE_PUBLIC_APP_URL') || ''}" 
             style="background: #3b82f6; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
            Open ChaiPaani
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from ChaiPaani.
          </p>
        </div>
      </div>
    `

    try {
      // Send email using smtp-send function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('smtp-send', {
        body: {
          to: member_email,
          subject,
          html
        }
      })

      if (emailError) {
        console.error('Failed to send email:', emailError)
        return new Response(
          JSON.stringify({ success: false, error: emailError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!emailData?.ok) {
        console.error('Email send failed:', emailData)
        return new Response(
          JSON.stringify({ success: false, error: emailData?.error || 'Unknown error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Exception sending email:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in notify-member-added function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
