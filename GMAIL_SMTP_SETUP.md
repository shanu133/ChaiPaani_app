# Gmail SMTP Configuration for ChaiPaani

This guide explains how to configure Gmail SMTP to send invitation emails from your ChaiPaani app.

---

## Option 1: Gmail with App Password (Recommended for Development)

### Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **2-Step Verification**
3. Follow the prompts to enable 2FA (required for app passwords)

### Step 2: Create App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. In the "Select app" dropdown, choose **Mail**
3. In the "Select device" dropdown, choose **Other (Custom name)**
4. Enter a name like "ChaiPaani App"
5. Click **Generate**
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
   - Remove spaces: `abcdefghijklmnop`

### Step 3: Configure Supabase Environment Variables

#### In Supabase Dashboard:

1. Go to **Project Settings** > **Edge Functions** > **Manage secrets**
2. Add these environment variables:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your.email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop   # Your 16-char app password (no spaces)
SMTP_FROM_EMAIL=your.email@gmail.com
SMTP_FROM_NAME=ChaiPaani App
ALLOWED_ORIGIN=https://your-app-domain.com
```

**Important Notes:**
- Use `SMTP_PORT=587` with `SMTP_SECURE=false` for STARTTLS
- Or use `SMTP_PORT=465` with `SMTP_SECURE=true` for SSL/TLS
- Never use your actual Gmail password, only the app password
- For development, you can set `ALLOWED_ORIGIN=*` (change to your domain in production)

#### For Local Development (.env):

Create `.env.local` in your project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# SMTP Feature Flag
VITE_ENABLE_SMTP=true

# Public App URL (for invite links)
VITE_PUBLIC_APP_URL=http://localhost:5173
```

**DO NOT** put SMTP credentials in frontend `.env` files!

---

## Option 2: Gmail with OAuth2 (Production Recommended)

For production use, OAuth2 is more secure than app passwords.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (e.g., "ChaiPaani Email")
3. Enable **Gmail API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Gmail API"
   - Click **Enable**

### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Add **Authorized redirect URIs**:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://your-app.com/auth/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 3: Generate Refresh Token

Use this Node.js script to get a refresh token:

```javascript
// gmail-oauth-setup.js
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
const CLIENT_SECRET = 'your-client-secret';
const REDIRECT_URI = 'http://localhost:3000/auth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Refresh Token:', tokens.refresh_token);
    console.log('\nAdd to Supabase Edge Function env:');
    console.log('GMAIL_CLIENT_ID=' + CLIENT_ID);
    console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
  } catch (err) {
    console.error('Error retrieving access token', err);
  }
});
```

Run:
```bash
npm install googleapis
node gmail-oauth-setup.js
```

### Step 4: Update Edge Function for OAuth2

Modify `supabase/functions/smtp-send/index.ts`:

```typescript
// For Gmail OAuth2
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.1/mod.ts";

const client = new SMTPClient({
  connection: {
    hostname: "smtp.gmail.com",
    port: 465,
    tls: true,
    auth: {
      username: Deno.env.get("GMAIL_EMAIL")!,
      password: await getGmailAccessToken(), // Get fresh access token
    },
  },
});

async function getGmailAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get("GMAIL_CLIENT_ID")!,
      client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!,
      grant_type: 'refresh_token',
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}
```

---

## Option 3: Gmail via Resend (Simplest Production Setup)

For production, consider using [Resend](https://resend.com) which handles Gmail delivery:

1. Sign up at [resend.com](https://resend.com)
2. Get API key
3. Verify your domain (or use their test domain)
4. Update Edge Function:

```typescript
// supabase/functions/smtp-send/index.ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'ChaiPaani <noreply@your-domain.com>',
    to: [emailTo],
    subject: emailSubject,
    html: emailHtml,
  }),
});
```

Supabase env:
```bash
RESEND_API_KEY=re_your_api_key
```

**Pros:** Simpler, no Gmail limits, better deliverability  
**Cons:** Requires verified domain for production

---

## Testing the Configuration

### 1. Via SMTP Settings Modal (In-App)

1. Run your app: `npm run dev`
2. Log in and go to **Settings** > **Notifications**
3. Click **Configure SMTP**
4. Fill in the fields (host, port, username, app password)
5. Click **Send Test Email**
6. Check your inbox for the test email

### 2. Via Supabase Edge Function Directly

In Supabase Dashboard > **Functions** > `smtp-send`:

```bash
# Test invoke
curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/smtp-send' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello from ChaiPaani!</h1>",
    "text": "Hello from ChaiPaani!"
  }'
```

### 3. Via Invitation Flow

1. Create a group
2. Click "Add Members"
3. Enter an email address
4. Click "Send Invitation"
5. Check the email inbox for the invitation email with link

---

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:** You're using your Gmail password instead of App Password
- Generate a new App Password (see Step 2 above)
- Use the 16-character app password without spaces

### Error: "Connection timeout"

**Solution:** Check port and security settings
- Try `SMTP_PORT=587` with `SMTP_SECURE=false` (STARTTLS)
- Or `SMTP_PORT=465` with `SMTP_SECURE=true` (SSL/TLS)
- Ensure your network/firewall allows SMTP connections

### Error: "Daily sending limit exceeded"

**Gmail Limits:**
- **Free Gmail:** 500 emails/day
- **Google Workspace:** 2,000 emails/day

**Solution:** 
- Use a transactional email service (Resend, SendGrid, Postmark)
- Or implement email queuing to stay within limits

### Emails going to spam

**Solutions:**
1. **Set up SPF record** for your domain
2. **Set up DKIM** signing
3. **Use a verified domain** (not @gmail.com for "from" address in production)
4. **Warm up your sending reputation** (start slow, increase gradually)
5. **Use a dedicated email service** (Resend, Postmark, SendGrid)

### Testing in development

For development testing without real emails:
- Use [Mailtrap](https://mailtrap.io) - fake SMTP for testing
- Use [MailHog](https://github.com/mailhog/MailHog) - local email testing

---

## Production Checklist

- [ ] Use App Password or OAuth2 (never real password)
- [ ] Set `ALLOWED_ORIGIN` to your actual domain
- [ ] Set up SPF/DKIM for your domain
- [ ] Monitor sending limits (Gmail: 500/day)
- [ ] Consider using Resend/SendGrid for scalability
- [ ] Test email deliverability (not spam)
- [ ] Add unsubscribe link for compliance
- [ ] Log email sends for debugging
- [ ] Implement rate limiting (prevent abuse)
- [ ] Set up error notifications for failed sends

---

## Quick Start Summary

**For Gmail Development:**

1. Enable 2FA on your Gmail account
2. Create App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. In Supabase Dashboard > Edge Functions > Manage secrets:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USERNAME=your.email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your.email@gmail.com
   SMTP_FROM_NAME=ChaiPaani App
   ALLOWED_ORIGIN=*
   ```
4. Deploy Edge Function: `supabase functions deploy smtp-send`
5. Test in-app via Settings > Notifications > Configure SMTP

Done! 🎉
