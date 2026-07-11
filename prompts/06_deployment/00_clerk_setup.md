# Phase 6 — File 00: Clerk One-Time Setup

> **Antigravity Instructions:** Walk the user through the Clerk dashboard steps. These are manual browser steps. Verify after each one.

---

## What This File Covers

Before deploying, Clerk needs to be configured correctly:
1. Add `role` claim to session tokens (critical for auth performance)
2. Authorise production domains
3. Set up the admin user role
4. Configure invite flow for agents

---

## Step 1: Add Role Claim to Session Token (CRITICAL)

This is the most important step. Without it, every API request would need to call Clerk's servers to get the user's role — adding 100–500ms of latency per request.

1. Go to: https://dashboard.clerk.com
2. Select your application (the same Clerk app used for the main website)
3. Left sidebar → **"Sessions"**
4. Find **"Customize session token"** section
5. In the JSON editor, enter:
   ```json
   {
     "role": "{{user.public_metadata.role}}"
   }
   ```
6. Click **"Save changes"**

**Verify:** Sign in to the agent app after this setup. The JWT should now contain `"role": "agent"`. You can verify by decoding a token at https://jwt.io.

---

## Step 2: Add Production Domains

1. Left sidebar → **"Domains"**
2. Click **"Add domain"**
3. Add `carry-agent.web.app`
4. Add `carry-admin.web.app`
5. Also add `carry-api.vercel.app` if it's not already there

Without this, Clerk refuses to issue JWTs for these origins.

---

## Step 3: Enable Email Invitations

1. Left sidebar → **"User & Authentication"** → **"Email, Phone, Username"**
2. Ensure "Email address" is enabled
3. Left sidebar → **"Email & SMS"** → **"Invitations"**
4. Ensure invitation emails are enabled
5. Optionally customise the invitation email template to mention "Carry Construction Field App"

---

## Step 4: Set Your Admin Role

Run this from the existing Real-Estate repo (the script is already there):

```bash
cd /Users/binova/Documents/Projects/Suru/Real-Estate
tsx apps/api/scripts/set-admin-role.ts <your-email>
```

Or use the Clerk dashboard:
1. Dashboard → **"Users"**
2. Find your user → click it
3. **"Metadata"** tab → **"Public metadata"**
4. Enter:
   ```json
   { "role": "admin" }
   ```
5. Save

---

## Step 5: Configure Allowed Redirect URLs

1. Left sidebar → **"Redirect URLs"**
2. Add:
   - `https://carry-agent.web.app`
   - `https://carry-agent.web.app/`
   - `https://carry-admin.web.app`
   - `https://carry-admin.web.app/`
   - `http://localhost:5181` (dev)
   - `http://localhost:5182` (dev)

---

## Verification

Sign in to `https://carry-agent.web.app` after Vercel + Firebase are deployed.

In browser DevTools → Application → Local Storage:
Look for a key starting with `__clerk_` — the JWT stored there should include `role` when decoded.

**✓ Phase 6, File 00 complete. Proceed to `06_deployment/01_neon_connect.md`.**
