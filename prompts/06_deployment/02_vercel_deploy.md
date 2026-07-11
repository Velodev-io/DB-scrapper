# Phase 6 — File 02: Deploy API to Vercel

> **Antigravity Instructions:** Wrap the Fastify app for Vercel serverless, deploy it, and set all environment variables. The user will need to do some browser steps for the Vercel dashboard.

---

## How Vercel + Fastify Works

Vercel runs Node.js as serverless functions. Fastify is normally a long-running server, but it can be wrapped in a Vercel handler using `@fastify/serverless` or a custom adapter.

We use a lightweight adapter: export the Fastify app as a Vercel handler.

---

## Step 1: Install Vercel Adapter

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection
npm install -w apps/api @fastify/aws-lambda
npm install -g vercel
```

---

## Step 2: Create Vercel Adapter

Create `apps/api/src/vercel.ts`:

```typescript
// Vercel serverless entry point
// This wraps the Fastify app for Vercel's serverless function runtime.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from './server.js'

// Cache the app instance across warm invocations (reduces cold start on subsequent calls)
let appPromise: ReturnType<typeof buildApp> | null = null

function getApp() {
  if (!appPromise) appPromise = buildApp()
  return appPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp()

  // Convert Vercel req/res to a format Fastify can handle
  await app.ready()
  app.server.emit('request', req, res)
}
```

---

## Step 3: Create vercel.json

Create `apps/api/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/vercel.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["prisma/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/vercel.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## Step 4: Update server.ts to Export buildApp

In `apps/api/src/server.ts`, the `buildApp()` function is already exported. The `main()` function at the bottom (which calls `app.listen()`) should only run when NOT in Vercel:

```typescript
// At the bottom of server.ts, replace the existing main() call with:
if (process.env.VERCEL !== '1') {
  async function main() {
    const app = await buildApp()
    await app.listen({ port: PORT, host: '0.0.0.0' })
    app.log.info(`✓ API        → http://localhost:${PORT}/api/v1`)
    app.log.info(`✓ Swagger UI → http://localhost:${PORT}/api/docs`)
  }
  main().catch(err => { console.error(err); process.exit(1) })
}
```

Vercel automatically sets `VERCEL=1` in the runtime environment, so `app.listen()` won't be called when deployed.

---

## Step 5: Deploy to Vercel

### 5a: Login to Vercel CLI

```bash
vercel login
```
Choose "Continue with GitHub". A browser window opens — log in with GitHub.

### 5b: Initialize the Vercel Project

From the repo root:
```bash
cd apps/api
vercel
```

Answer the prompts:
- "Set up and deploy?" → **Y**
- "Which scope?" → your personal account
- "Link to existing project?" → **N**
- "Project name?" → `carry-api`
- "In which directory?" → `.` (current directory — apps/api)
- "Want to override settings?" → **N**

This creates `apps/api/.vercel/` — do not gitignore this file.

### 5c: Set Environment Variables in Vercel

```bash
# Set each variable (Vercel will prompt for the value):
vercel env add DATABASE_URL production
vercel env add CLERK_SECRET_KEY production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
vercel env add SENTRY_DSN production
vercel env add CORS_ORIGIN production
```

For `CORS_ORIGIN`, enter: `https://carry-agent.web.app,https://carry-admin.web.app`
For `DATABASE_URL`, enter: your Neon production connection string (from Phase 1)

### 5d: Deploy to Production

```bash
vercel --prod
```

Expected output:
```
✓ Production deployment complete
  Preview: https://carry-api-xxx.vercel.app
  Production: https://carry-api.vercel.app
```

---

## Step 6: Update Frontend .env Files

In `apps/agent/.env` and `apps/admin/.env`, update `VITE_API_BASE`:
```env
VITE_API_BASE=https://carry-api.vercel.app/api/v1
```

Also update Firebase environment variables before deploying frontends (next file).

---

## Step 7: Verify Production API

```bash
curl https://carry-api.vercel.app/health
```

Expected:
```json
{
  "ok": true,
  "service": "carry-api",
  "version": "1.0.0",
  "db": "connected"
}
```

Visit Swagger UI:
`https://carry-api.vercel.app/api/docs`

Should load the full interactive API documentation.

---

## GitHub Auto-Deploy Setup

1. In Vercel dashboard → carry-api project → Settings → Git
2. Connect your GitHub repo
3. Set "Root Directory" to `apps/api`
4. From now on: push to `main` → Vercel auto-deploys the API

---

## Concurrency at 50 Agents

Vercel serverless handles concurrency differently from a traditional server:
- Each request spins up its own function instance
- 50 simultaneous agents = 50 simultaneous function instances
- Vercel free tier: **100 concurrent executions** → sufficient
- Each function instance holds its own Prisma client connection

**Important:** Add `connection_limit=1` to the Neon DATABASE_URL for serverless:
```
postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require&connection_limit=1&pool_timeout=10
```

This prevents connection pool exhaustion. Neon handles the actual pooling via PgBouncer.

**✓ Phase 6, File 02 complete. Proceed to `06_deployment/03_firebase_deploy.md`.**
