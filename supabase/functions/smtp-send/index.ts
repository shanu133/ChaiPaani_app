// Minimal SMTP send Edge Function.
// IMPORTANT: Set environment variables in Supabase project:
//  SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME
// Optionally: SMTP_SECURE ("true"|"false")

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

interface SendBody {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function boolEnv(name: string, def = false): boolean {
  const v = (Deno.env.get(name) ?? "").toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return def;
}

Deno.serve(async (req) => {
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
    const { to, subject, html, text } = (await req.json()) as SendBody;
    if (!to || !subject) {
      return new Response(JSON.stringify({ ok: false, error: "Missing 'to' or 'subject'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const host = Deno.env.get("SMTP_HOST") ?? "";
    const port = Number(Deno.env.get("SMTP_PORT") ?? 587);
    const user = Deno.env.get("SMTP_USERNAME") ?? "";
    const pass = Deno.env.get("SMTP_PASSWORD") ?? "";
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") ?? "noreply@example.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") ?? "ChaiPaani";
    const secure = boolEnv("SMTP_SECURE", port === 465);

    if (!host || !user || !pass) {
      return new Response(JSON.stringify({ ok: false, error: "SMTP env not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        tls: secure,
        auth: { username: user, password: pass },
      },
    });

    try {
      await client.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        content: html ? undefined : text || "",
        html,
      });
      await client.close();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (e) {
      try { await client.close(); } catch {}
      return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
