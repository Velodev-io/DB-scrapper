# Phase 6 — File 06: 50-Agent Concurrency Readiness Checklist

> **Antigravity Instructions:** Go through every item in this checklist. Fix any that are not yet done. This is the final gate before going live.

---

## Concurrency Architecture Overview

```
50 agents simultaneously
        │
        ├── Agent App (Firebase CDN)
        │   └── CDN serves static files from edge → zero server load
        │       50 agents = 50 CDN cache hits, not 50 server requests
        │
        ├── API (Vercel Serverless)
        │   └── Each request = its own function instance
        │       50 concurrent requests = 50 function instances (Vercel free: 100 limit ✓)
        │
        ├── Neon PostgreSQL
        │   └── Each Vercel function gets 1 DB connection (connection_limit=1)
        │       50 concurrent requests = max 50 DB connections
        │       Neon free tier: 100 connection limit ✓
        │       PgBouncer pooling handles connection reuse automatically
        │
        └── Cloudinary
            └── Direct browser → Cloudinary uploads
                API is never in the upload path
                50 agents uploading simultaneously = 50 direct Cloudinary connections
                Cloudinary free tier handles this with no issue ✓
```

---

## Checklist

### ☐ API: Connection Limit Set

Verify `apps/api/.env` and Vercel env have:
```
DATABASE_URL=...?sslmode=require&connection_limit=1&pool_timeout=10
```

Without `connection_limit=1`, each serverless function could open multiple DB connections, quickly exhausting Neon's 100-connection limit.

### ☐ API: Rate Limiting Configured

Verify in `server.ts`:
```typescript
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
```

120 requests/minute per IP. With 50 agents each making ~2 requests/minute, total load = 100 requests/minute — safely under the limit.

### ☐ API: Request Timeout Set

Verify in `server.ts`:
```typescript
const app = Fastify({ requestTimeout: 30_000 })
```

Prevents Vercel function from hanging indefinitely if Clerk or Cloudinary are slow.

### ☐ Auth: JWT Claims (No Per-Request Clerk API Call)

Verify in `auth.ts`:
- `requireAgent` and `requireAdmin` call `verifyToken()` only — no `clerkClient.users.getUser()`
- Clerk Dashboard → Sessions → role claim is configured

Without this, 50 agents making concurrent requests = 50 simultaneous HTTP calls to Clerk's API.

### ☐ Images: Client-Side Compression Active

Verify in `apps/agent/src/lib/compress.ts`:
- Max width: 1920px
- JPEG quality: 0.82
- Output: ~600KB–1MB per photo

Without compression, an agent uploading 10 full-quality photos (6MB each) = 60MB upload. On 3G that's 8 minutes.

### ☐ Images: Sequential Uploads (Adaptive Worker Pool)

Verify in `UploadManager.ts`:
- `MAX_WORKERS` adapts to network: 1 on 2G, 2 on 3G, 3 on 4G
- Photos upload sequentially per worker (not `Promise.all`)

### ☐ Images: Cloudinary Upload Bypasses API

Verify uploads go directly: Browser → Cloudinary (not Browser → API → Cloudinary)

The API only generates the signature (`GET /api/v1/uploads/sign`). The actual image bytes never pass through Vercel.

### ☐ Frontend: Fonts Use font-display Swap

Verify in `apps/agent/src/index.css`:
```css
/* Override @fontsource default to prevent invisible text on slow connections */
@font-face {
  font-display: swap;
}
```

Without this, text is invisible until fonts load — on 3G that can be 3–5 seconds.

### ☐ Frontend: Bundle Size Under 300KB

Run and verify:
```bash
npm run build -w apps/agent
```

Look at the build output. The `dist/assets/` files should total < 300KB gzipped.

If over budget, check for accidentally imported heavy libraries.

### ☐ Forms: localStorage Persistence Active

Verify every form saves to localStorage on input change (debounced 500ms).

Test: Fill out half the property form → close tab → reopen → form should be pre-filled.

### ☐ Offline: IndexedDB Queue Works

Test procedure:
1. Open agent app on a phone
2. Add 3 photos to the property form
3. Enable airplane mode
4. Wait for photos to show "📶 Queued" status
5. Re-enable WiFi
6. Wait 10–20 seconds
7. Check admin inbox — all 3 photos should appear

### ☐ Vercel: Function Region Set to Mumbai

Vercel functions run in a region closest to users. For Indian agents, set the region to `bom1` (Mumbai):

In `apps/api/vercel.json`:
```json
{
  "regions": ["bom1"]
}
```

This reduces API latency from ~200ms (US region) to ~30ms (Mumbai).

### ☐ Firebase: CDN Headers Set

Verify `firebase.json` has aggressive caching for JS/CSS assets and no-cache for `index.html`:
```json
{
  "headers": [
    { "source": "**/*.js", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

This means agents' phones cache the app after first load — subsequent loads are instant even on 2G.

### ☐ Sentry: Alerts Configured for All 3 Projects

Verify email alerts are set up in Sentry for `carry-agent`, `carry-admin`, and `carry-api`.

### ☐ Clerk: Production Domains Added

Verify in Clerk dashboard → Domains:
- `carry-agent.web.app` ✓
- `carry-admin.web.app` ✓
- `carry-api.vercel.app` ✓

### ☐ Admin: Can Invite an Agent End-to-End

Test the full flow:
1. Sign in to admin app as admin
2. Go to Agents page → "Invite Agent"
3. Enter a test email
4. Check the email inbox — invitation should arrive
5. Click invitation link → create account
6. Sign in to agent app with the new account
7. Submit a test property
8. Back in admin — verify the property appears in Properties inbox

---

## Load Test (Optional but Recommended)

If you want to simulate 50 agents before go-live:

```bash
# Install artillery (free load testing tool)
npm install -g artillery

# Create a quick test
cat > load-test.yml << 'EOF'
config:
  target: https://carry-api.vercel.app
  phases:
    - duration: 60
      arrivalRate: 50    # 50 requests/second for 60 seconds
scenarios:
  - flow:
    - get:
        url: /health
EOF

artillery run load-test.yml
```

All responses should be `200 OK` with < 500ms response time.

---

## ✓ All Items Checked = Ready for 50 Agents

**Congratulations — the Carry Construction Field Ops Tool is production-ready.**

Live URLs:
- Agent app: https://carry-agent.web.app
- Admin app: https://carry-admin.web.app
- API + Swagger: https://carry-api.vercel.app/api/docs
