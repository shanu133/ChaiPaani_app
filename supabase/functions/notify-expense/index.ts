// Edge Function to send email notifications when expenses are created
// This function is triggered by a database webhook or can be called directly

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpenseNotificationPayload {
  expense_id: string
  group_id: string
  payer_id: string
  description: string
  amount: number
  category?: string
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

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Parse request body
    const payload: ExpenseNotificationPayload = await req.json()
    const { expense_id, group_id, payer_id, description, amount, category } = payload

    if (!expense_id || !group_id || !payer_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get payer details
    const { data: payer, error: payerError } = await supabase
      .from('profiles')
      .select('email, display_name, full_name')
      .eq('id', payer_id)
      .single()

    if (payerError || !payer) {
      console.error('Error fetching payer:', payerError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payer details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payerName = payer.display_name || payer.full_name || payer.email?.split('@')[0] || 'Someone'

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('name')
      .eq('id', group_id)
      .single()

    if (groupError || !group) {
      console.error('Error fetching group:', groupError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch group details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get expense splits (users who owe money)
    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .select(`
        user_id,
        amount,
        profiles:user_id (
          email,
          display_name,
          full_name
        )
      `)
      .eq('expense_id', expense_id)
      .neq('user_id', payer_id) // Exclude the payer

    if (splitsError) {
      console.error('Error fetching expense splits:', splitsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expense splits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email to each user who owes money
    const emailPromises = (splits || []).map(async (split: any) => {
      const userEmail = split.profiles?.email
      const userName = split.profiles?.display_name || split.profiles?.full_name || userEmail?.split('@')[0] || 'User'
      
      if (!userEmail) {
        console.warn(`No email found for user ${split.user_id}`)
        return { success: false, error: 'No email' }
      }

      const subject = `New Expense in ${group.name}`
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">ChaiPaani</h1>
            <p style="color: #6b7280; margin-top: 5px;">Expense Notification</p>
          </div>
          
          <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">New Expense Added</h2>
            
            <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px;">Description:</span>
                <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827; font-size: 16px;">${description}</p>
              </div>
              
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px;">Paid by:</span>
                <p style="margin: 4px 0 0 0; font-weight: 500; color: #111827;">${payerName}</p>
              </div>
              
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px;">Group:</span>
                <p style="margin: 4px 0 0 0; font-weight: 500; color: #111827;">${group.name}</p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #6b7280; font-size: 14px;">Total Amount:</span>
                  <span style="font-weight: 700; color: #111827; font-size: 18px;">₹${amount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                  <span style="color: #dc2626; font-size: 14px; font-weight: 600;">You owe:</span>
                  <span style="font-weight: 700; color: #dc2626; font-size: 20px;">₹${split.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            ${category ? `<div style="margin-top: 12px;">
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                ${category}
              </span>
            </div>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${Deno.env.get('VITE_PUBLIC_APP_URL') || ''}" 
               style="background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
              View in ChaiPaani
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
        // Call the SMTP send function
        const { data: emailData, error: emailError } = await supabase.functions.invoke('smtp-send', {
          body: {
            to: userEmail,
            subject,
            html
          }
        })

        if (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError)
          return { success: false, error: emailError.message, email: userEmail }
        }

        if (!emailData?.ok) {
          console.error(`Email send failed for ${userEmail}:`, emailData)
          return { success: false, error: emailData?.error || 'Unknown error', email: userEmail }
        }

        return { success: true, email: userEmail }
      } catch (error) {
        console.error(`Exception sending email to ${userEmail}:`, error)
        return { success: false, error: error.message, email: userEmail }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} emails, ${failCount} failed`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in notify-expense function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
