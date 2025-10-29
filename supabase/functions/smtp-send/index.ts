// IMPORTANT: Email sender using Supabase Auth invite with custom data
// deno-lint-ignore-file no-explicit-any
// @ts-ignore
declare const Deno: any;

interface SendBody {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  inlineLogoUrl?: string;
  groupName?: string;
  inviterName?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { to, subject, html, text, groupName, inviterName } = (await req.json()) as SendBody;
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ ok: false, error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Prepare data for the invite
    const inviteData = {
      groupName: groupName || "a group",
      inviterName: inviterName || "Someone",
      subject: subject,
      html: html,
      text: text,
    };

    // Send invite using Supabase REST API
    const response = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
      },
      body: JSON.stringify({
        email: Array.isArray(to) ? to[0] : to,
        data: inviteData,
        redirect_to: `${Deno.env.get("SITE_URL") || "http://localhost:3002"}/auth/callback`
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Supabase API error:", errorData);
      
      // If user already exists, return success (don't send email for existing users)
      if (errorData.includes('email_exists')) {
        console.log("User already exists, skipping invite email (user is already registered)");
        return new Response(JSON.stringify({ ok: true, message: "User already registered" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ ok: false, error: `Email service error: ${response.status}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = await response.json();
    console.log("Email sent successfully via Supabase Auth:", { to, subject, result });

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Email sending failed:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : "Internal error") }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
