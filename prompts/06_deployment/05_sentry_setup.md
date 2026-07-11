# Phase 6 — File 05: Sentry Error Monitoring

> **Antigravity Instructions:** Set up Sentry for both frontend apps and the API. Walk the user through the Sentry dashboard steps, then implement the code.

---

## What This Sets Up

- Sentry catches all unhandled errors in both frontend apps and the Fastify API
- Email alert when something breaks in production
- Shows exact file + line number of the error
- Groups repeated errors so your inbox doesn't get spammed

---

## Step 1: Create Sentry Account (User Does This)

1. Go to: https://sentry.io/signup/
2. Sign up with GitHub
3. Organisation name: `carry-construction`
4. Skip the onboarding wizard — we'll set it up manually

---

## Step 2: Create Three Projects in Sentry

1. In Sentry dashboard → **"Projects"** → **"Create Project"**

Create these three:
| Project Name | Platform |
|---|---|
| `carry-agent` | React |
| `carry-admin` | React |
| `carry-api` | Node.js (Fastify) |

For each project, copy the **DSN** (looks like `https://xxx@xxx.ingest.sentry.io/xxx`).

---

## Step 3: Install Sentry in Agent App

```bash
npm install -w apps/agent @sentry/react
```

In `apps/agent/src/main.tsx`, add at the very top (before any imports):

```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,     // 'development' or 'production'
  enabled: import.meta.env.PROD,         // only active in production builds
  tracesSampleRate: 0.1,                 // 10% of transactions traced (free tier safe)
  replaysSessionSampleRate: 0,           // no session replay (costs money)
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
})
```

Add to `apps/agent/.env`:
```env
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Add to GitHub Actions secrets: `VITE_SENTRY_DSN_AGENT` = the agent project DSN.

---

## Step 4: Install Sentry in Admin App

Same as agent:
```bash
npm install -w apps/admin @sentry/react
```

Same code in `apps/admin/src/main.tsx`.

Add to `apps/admin/.env`:
```env
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx   ← admin project DSN
```

---

## Step 5: API Sentry (Already Installed)

`@sentry/node` was installed in Phase 2 File 00. Verify it's in `apps/api/src/server.ts`:

```typescript
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.2,
  })
}
```

Add to Vercel env vars:
```bash
cd apps/api
vercel env add SENTRY_DSN production
```

---

## Step 6: Configure Alerts in Sentry

1. Sentry dashboard → your project → **"Alerts"** → **"Create Alert"**
2. Alert type: **"Issues"**
3. Conditions: "A new issue is created"
4. Action: **"Send an email"** → your email
5. Save

Repeat for all three projects.

---

## Step 7: Add Sentry DSNs to GitHub Actions

Update `.github/workflows/deploy.yml` to pass Sentry DSNs:

```yaml
- name: Build agent app
  env:
    VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
    VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
    VITE_CLOUDINARY_CLOUD_NAME: ${{ secrets.VITE_CLOUDINARY_CLOUD_NAME }}
    VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN_AGENT }}
  run: npm run build -w apps/agent
```

---

## Verification

After deploying with Sentry enabled, test it manually:

In `apps/agent/src/main.tsx` temporarily add:
```typescript
// Test Sentry is working
if (import.meta.env.PROD) {
  throw new Error('Sentry test error — delete this line after verifying')
}
```

Deploy, open the app — it should break. Go to Sentry → carry-agent project → Issues. The error should appear within 30 seconds.

Remove the test throw and redeploy.

**✓ Phase 6, File 05 complete. Proceed to `06_deployment/06_concurrency_checklist.md`.**
