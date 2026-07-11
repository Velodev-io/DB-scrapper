# Phase 6 — File 03: Deploy Agent + Admin to Firebase Hosting

> **Antigravity Instructions:** The agent must do the Firebase console steps. You handle all CLI commands and config files.

---

## Architecture

```
Firebase Hosting Project 1: carry-agent → https://carry-agent.web.app
Firebase Hosting Project 2: carry-admin → https://carry-admin.web.app

Both are static SPA builds served from Firebase's global CDN.
The CDN handles 50+ simultaneous users with zero config.
```

---

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```
A browser window opens. Log in with your Google account.

---

## Step 2: Create Firebase Projects (User Does This in Console)

1. Go to: https://console.firebase.google.com
2. Click **"Add project"**
3. Name: `carry-agent` → Continue → Disable Google Analytics → Create project
4. Repeat for `carry-admin`

---

## Step 3: Initialize Firebase in Agent App

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection/apps/agent
firebase init hosting
```

Answer the prompts:
- "Please select an option" → **Use an existing project**
- "Select a default Firebase project" → `carry-agent`
- "What do you want to use as your public directory?" → `dist`
- "Configure as a single-page app?" → **Yes**
- "Set up automatic builds and deploys with GitHub?" → **No** (we configure GitHub Actions manually)
- "Overwrite dist/index.html?" → **No**

This creates `apps/agent/firebase.json` and `apps/agent/.firebaserc`.

Verify `apps/agent/firebase.json` looks like:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.js",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**/*.css",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

---

## Step 4: Initialize Firebase in Admin App

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection/apps/admin
firebase init hosting
```

Same prompts, select `carry-admin` project.

---

## Step 5: Set Production Environment Variables

Before building, update both `.env` files with production URLs:

`apps/agent/.env` — add/update:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...    ← your live Clerk key
VITE_API_BASE=https://carry-api.vercel.app/api/v1
VITE_CLOUDINARY_CLOUD_NAME=carry-construction
```

`apps/admin/.env` — same:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_BASE=https://carry-api.vercel.app/api/v1
VITE_CLOUDINARY_CLOUD_NAME=carry-construction
```

---

## Step 6: Build and Deploy Agent App

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection

# Build agent app
npm run build -w apps/agent

# Deploy to Firebase
cd apps/agent
firebase deploy --only hosting
```

Expected output:
```
=== Deploying to 'carry-agent'...
i  hosting: beginning deploy...
✔  hosting: 12 files uploaded successfully
✔  Deploy complete!
Hosting URL: https://carry-agent.web.app
```

---

## Step 7: Build and Deploy Admin App

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection

# Build admin app
npm run build -w apps/admin

# Deploy to Firebase
cd apps/admin
firebase deploy --only hosting
```

Expected:
```
Hosting URL: https://carry-admin.web.app
```

---

## Step 8: Verify Both Apps Live

1. Open `https://carry-agent.web.app` in Chrome on an Android phone
   - Should show the Clerk sign-in screen
   - Should load in < 3 seconds on 4G

2. Open `https://carry-admin.web.app` in Chrome desktop
   - Should show the admin Clerk sign-in screen

3. Both should use the correct API:
   - Open browser DevTools → Network tab → look for calls to `carry-api.vercel.app`

---

## Step 9: Authorise Domains in Clerk

In Clerk Dashboard → your application → **Domains**:
- Add `carry-agent.web.app`
- Add `carry-admin.web.app`

Without this, Clerk will reject logins from these domains.

---

## Performance: Firebase CDN for 50 Agents

Firebase Hosting uses Google's CDN — the same infrastructure as Google.com:
- Files are cached at edge nodes globally
- 50 agents loading the app simultaneously = 50 CDN cache hits = near-zero load
- Free tier: 10 GB storage, 360 MB/day bandwidth
- The entire agent app build is ~2–3 MB → 360 MB covers 120+ full app loads/day

---

## Add to Root Scripts (Convenience)

Update root `package.json` scripts section:
```json
{
  "scripts": {
    "deploy:agent": "npm run build -w apps/agent && cd apps/agent && firebase deploy --only hosting",
    "deploy:admin": "npm run build -w apps/admin && cd apps/admin && firebase deploy --only hosting",
    "deploy:api":   "cd apps/api && vercel --prod",
    "deploy:all":   "npm run deploy:agent && npm run deploy:admin && npm run deploy:api"
  }
}
```

**✓ Phase 6, File 03 complete. Proceed to `06_deployment/04_github_ci.md`.**
