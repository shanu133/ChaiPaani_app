# SMTP setup for ChaiPaani (Supabase)

This guide walks you through configuring SMTP-driven email delivery for invitations and notifications using a Supabase Edge Function. It also includes quick verification steps and notes for production hardening.

## 1) Prerequisites
- A working Supabase project (URL and API keys)
- SMTP provider credentials (e.g., SendGrid, SES, Mailgun, Postmark, Gmail SMTP)
- Edge Functions enabled in your Supabase project

## 2) Deploy the smtp-send Edge Function

This repo includes a generic Edge Function at `supabase/functions/smtp-send/index.ts` which sends emails via SMTP. It runs in Supabase's Deno runtime.

Environment variables to set in Supabase Dashboard (Project Settings → Functions → Environment variables):
- `SMTP_HOST` — e.g., `smtp.sendgrid.net`
- `SMTP_PORT` — `587` (STARTTLS) or `465` (SSL)
- `SMTP_USERNAME` — SMTP username (e.g., `apikey` for SendGrid)
- `SMTP_PASSWORD` — SMTP password or API key
- `SMTP_FROM_EMAIL` — From address (verified domain recommended)
- `SMTP_FROM_NAME` — From name (e.g., `ChaiPaani`)
- `SMTP_SECURE` — `true` if using 465 SSL; `false` for 587 STARTTLS
- `ALLOWED_ORIGIN` — your frontend origin (e.g., `https://your-app.com`) to relax CORS

Then deploy the function:
1. Ensure you have Supabase CLI installed (`supabase --version`).
2. From the project root, run:
   - `supabase functions deploy smtp-send`
   - Optional: `supabase functions list` to confirm

Verify CORS: The function includes permissive CORS headers by default; setting `ALLOWED_ORIGIN` is recommended for production.

## 3) Frontend configuration flags
In your frontend environment (e.g., `.env.local`), set:
- `VITE_ENABLE_SMTP=true` — enables SMTP path for invites
- `VITE_PUBLIC_APP_URL=https://your-app.com` — used for building invite links in emails

Note: Secrets (SMTP credentials) must NOT be placed in frontend env. The Edge Function reads them server-side from Supabase env.

## 4) Using the in-app SMTP Settings modal
In Settings → Notifications, click “Configure” to open the SMTP modal. These fields are for local configuration assistance; they are not used to send emails from the client. The “Send Test” button invokes the `smtp-send` function to validate deliveries against your server-side env.

## 5) Invitation emails
When `VITE_ENABLE_SMTP=true`, inviting a member from the app will:
- Create an invitation record in `invitations` (with a token)
- Build an invite link using `VITE_PUBLIC_APP_URL/#token=...`
- Invoke `smtp-send` to deliver the email to the invitee
- You can resend invitations from the Add Members modal

If you prefer the legacy function (`invite-user`) path, set `VITE_ENABLE_INVITE_EMAIL=true` as a fallback; otherwise keep it `false`.

## 6) Verifying end-to-end
- Use the SMTP modal “Send Test” with your email to confirm your env works
- Invite a user to a group and confirm they get an email
- Open the invite link (contains `#token=...`), log in/sign up, and confirm auto-join

## 7) Production hardening
- Use a dedicated subdomain (e.g., `mail.your-domain.com`) with SPF/DKIM/DMARC configured
- Rotate SMTP credentials regularly and store them only in Supabase env (never in the frontend)
- Add per-function rate limits (via API Gateway or function middleware) to prevent abuse
- Log message IDs and store email delivery outcomes if your provider exposes hooks
- Prefer provider APIs (HTTP) for better deliverability/observability if available

## 8) Troubleshooting
- Check Supabase Function logs in Dashboard → Functions → Logs
- Temporarily widen `ALLOWED_ORIGIN=*` to rule out CORS, then tighten for production
- Verify From domain is authorized by your provider; emails from unverified domains often land in spam

---

With this setup, ChaiPaani sends reliable invitation emails from the backend, keeping secrets server-side and enabling easy local verification.
