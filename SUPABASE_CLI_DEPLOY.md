# Supabase CLI Deployment Instructions

## Get Your Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your profile icon (top right)
3. Click **"Account Settings"**
4. Click **"Access Tokens"** in left sidebar
5. Click **"Generate New Token"**
6. Name it: "CLI Deployment"
7. **Copy the token** (save it somewhere safe!)

## Login with Token

In your terminal:

```powershell
supabase login --token YOUR_ACCESS_TOKEN_HERE
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token you just copied.

## Link to Your Project

You need your project reference ID:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your ChaiPaani project
3. Click **"Project Settings"** (gear icon)
4. Find **"Reference ID"** under "General settings"
5. Copy it (looks like: `abc123defghijklmnop`)

Then run:

```powershell
supabase link --project-ref YOUR_PROJECT_REF_HERE
```

## Deploy the Edge Function

```powershell
supabase functions deploy smtp-send
```

That's it! The function will be deployed to your Supabase project.

---

## Full Command Sequence

```powershell
# 1. Login (use your token from dashboard)
supabase login --token sbp_1234567890abcdef...

# 2. Link project (use your project ref)
supabase link --project-ref abcdefghijklmnop

# 3. Deploy function
supabase functions deploy smtp-send

# Success! ✅
```

---

## After Deployment

Don't forget to configure environment variables in Supabase Dashboard:

**Project Settings > Edge Functions > Manage secrets**

Add:
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

Then test it!
