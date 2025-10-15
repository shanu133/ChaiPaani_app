# Quick Deployment Guide - Supabase Edge Function

Since Supabase CLI installation is complex on Windows, here's how to deploy via the Dashboard:

---

## Deploy `smtp-send` Edge Function via Dashboard

### Step 1: Go to Supabase Dashboard

1. Visit: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your account
3. Select your **ChaiPaani** project

### Step 2: Navigate to Edge Functions

1. Click **"Edge Functions"** in the left sidebar
2. Click **"Create a new function"** or **"+ New Function"** button

### Step 3: Create the Function

1. **Function name**: Enter `smtp-send`
2. Click **"Create function"**

### Step 4: Copy Your Code

Open the file in your project:
```
supabase/functions/smtp-send/index.ts
```

**Copy the ENTIRE contents** (should be ~90 lines)

### Step 5: Paste and Deploy

1. In the Supabase Dashboard code editor, **delete any template code**
2. **Paste your copied code**
3. Click **"Deploy"** button (top right)
4. Wait for deployment to complete (~30 seconds)
5. ✅ You should see "Successfully deployed"

---

## Configure Environment Variables

### Step 6: Set SMTP Credentials

1. In the Edge Functions page, click **"Manage secrets"** or **"Environment variables"**
2. Add these **8 required variables**:

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

**Important:**
- Replace `your.email@gmail.com` with your actual Gmail
- Replace `your-16-char-app-password` with the Gmail App Password (see GMAIL_SMTP_SETUP.md)
- For production, change `ALLOWED_ORIGIN=*` to your actual domain

3. Click **"Save"** after adding all variables

---

## Test the Function

### Option A: Test via Dashboard

1. In the Edge Functions page, click on `smtp-send`
2. Click **"Invoke function"** or **"Test"**
3. Use this test payload:

```json
{
  "to": "your.email@gmail.com",
  "subject": "Test Email from ChaiPaani",
  "html": "<h1>Hello!</h1><p>This is a test email from your SMTP function.</p>",
  "text": "Hello! This is a test email from your SMTP function."
}
```

4. Click **"Send request"**
5. Check response: Should see `{ "ok": true }`
6. Check your email inbox!

### Option B: Test via Your App

1. Run your app: `npm run dev`
2. Go to **Settings** > **Notifications**
3. Click **"Configure SMTP"**
4. Fill in SMTP details (same as environment variables)
5. Click **"Send Test Email"**
6. Check your inbox!

---

## Verify Deployment

Check that everything is working:

```
✅ Edge Function deployed
✅ Environment variables configured
✅ Test email received
```

---

## Next Steps

After Edge Function is deployed and tested:

1. ✅ **Test invitation flow**:
   - Create a group in your app
   - Click "Add Members"
   - Enter an email address
   - Click "Send Invitation"
   - Check email for invitation link

2. ✅ **Create Pull Request** (see your todo list)

3. ✅ **Optional: Set up CodeRabbit** for automated reviews

---

## Troubleshooting

### Error: "Failed to deploy"
- Check that your code syntax is correct
- Make sure you copied the ENTIRE file contents
- Try refreshing the page and deploying again

### Error: "SMTP connection failed"
- Verify SMTP_HOST, SMTP_PORT, SMTP_USERNAME are correct
- Make sure SMTP_PASSWORD is your **App Password**, not your Gmail password
- Check that 2FA is enabled on your Gmail account

### Email not received
- Check spam folder
- Verify SMTP_FROM_EMAIL matches SMTP_USERNAME
- Try sending to a different email address
- Check Supabase Edge Function logs for errors

---

## Alternative: Install Supabase CLI (Advanced)

If you want to use CLI for future deployments, install via Scoop:

```powershell
# Install Scoop (Windows package manager)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Then deploy
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy smtp-send
```

---

**Need help?** Check:
- `GMAIL_SMTP_SETUP.md` - Gmail App Password setup
- `SMTP_SETUP.md` - General SMTP configuration
- Supabase Dashboard > Edge Functions > Logs - View function execution logs
