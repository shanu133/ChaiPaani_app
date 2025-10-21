// Minimal SMTP send Edge Function.
// IMPORTANT: Set environment variables in Supabase project:
//  SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME
// Optionally: SMTP_SECURE ("true"|"false"), SMTP_TIMEOUT_MS (default: 30000)

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

interface SendBody {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

// SECURITY: ALLOWED_ORIGIN must be explicitly set to your trusted frontend origin in production.
// Using "*" allows any website to call this function, which is a security risk.
// Examples: "https://yourdomain.com" or "https://yourapp.vercel.app"
// Only "*" is permitted if DENO_DEPLOYMENT_ID is not set (local development).
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN");
const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

// Validate CORS configuration
if (!allowedOrigin) {
  if (isProduction) {
    // In production, ALLOWED_ORIGIN must be explicitly set
    throw new Error(
      "SECURITY ERROR: ALLOWED_ORIGIN environment variable is required in production. " +
      "Set it to your trusted frontend origin (e.g., 'https://yourdomain.com'). " +
      "Using '*' is insecure and allows any website to call this function."
    );
  } else {
    // In development, warn but allow "*"
    console.warn(
      "⚠️  WARNING: ALLOWED_ORIGIN is not set. Using '*' which allows ANY origin. " +
      "This is only acceptable in local development. " +
      "Set ALLOWED_ORIGIN to your frontend URL before deploying to production."
    );
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin ?? "*",
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

function numEnv(name: string, def: number): number {
  const v = Deno.env.get(name);
  if (!v) return def;
  const parsed = Number(v);
  return isNaN(parsed) ? def : parsed;
}

// Wrap SMTP operations with timeout to prevent hanging
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: number | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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
    if (!to || !subject || (!html && !text)) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required fields: 'to', 'subject', and at least one of 'html' or 'text'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const host = Deno.env.get("SMTP_HOST") ?? "";
    const port = numEnv("SMTP_PORT", 587);    const user = Deno.env.get("SMTP_USERNAME") ?? "";
    const pass = Deno.env.get("SMTP_PASSWORD") ?? "";
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") ?? "noreply@example.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") ?? "ChaiPaani";
    const secure = boolEnv("SMTP_SECURE", port === 465);
    const timeoutMs = numEnv("SMTP_TIMEOUT_MS", 30000); // Default 30 seconds

    // Debug logging (without password)
    console.log("SMTP Config:", { host, port, user: user ? "set" : "missing", pass: pass ? "set" : "missing", fromEmail, fromName, secure, timeoutMs });

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
      console.log("Attempting to send email to:", to);
      
      await withTimeout(
        client.send({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          content: text || "",          html,
        }),
        timeoutMs,
        "SMTP send operation"
      );
      
      await withTimeout(
        client.close(),
        5000, // 5 second timeout for cleanup
        "SMTP close connection"
      );
      
      console.log("Email sent successfully!");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const isTimeout = errorMsg.includes("timed out");
      
      console.error(isTimeout ? "SMTP operation timed out:" : "SMTP send error:", errorMsg);
      
      // Attempt cleanup
      try { 
        await withTimeout(client.close(), 2000, "SMTP cleanup"); 
      } catch (closeErr) {
        console.error("Failed to close SMTP client:", closeErr);
      }
      
      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: isTimeout ? 504 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (e: unknown) {
    console.error("Function error:", e);
    const errorMsg = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
