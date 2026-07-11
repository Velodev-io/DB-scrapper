# Phase 2 — File 01: Auth Middleware (Clerk JWT — No API Round-Trip)

> **Antigravity Instructions:** Build the auth middleware. This is the most critical performance piece — it must use JWT claims only and never call Clerk's API per request.

---

## Critical Design Decision

Every API route in this project requires authentication. The naive approach calls `clerkClient.users.getUser()` to verify the role — that's an **HTTP call to Clerk's servers on every request**.

With 50 agents making concurrent requests, this creates 50 simultaneous outbound HTTP calls per second. If Clerk has any latency, every agent feels it.

**The correct approach:** Embed the role in the JWT using Clerk's session token customization. Then `verifyToken()` does a local crypto check only — no network call.

---

## Step 0: Configure Clerk Dashboard (User Does This Once)

1. Go to https://dashboard.clerk.com
2. Select your application
3. Left sidebar → **"Sessions"**
4. Scroll to **"Customize session token"**
5. In the JSON editor, add:
   ```json
   {
     "role": "{{user.public_metadata.role}}"
   }
   ```
6. Click **"Save"**

From now on, every JWT issued by Clerk will contain a `role` claim that equals the user's `publicMetadata.role` value (`"agent"`, `"admin"`, or `null`).

---

## File: apps/api/src/lib/auth.ts

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@clerk/backend'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY ?? ''

// ── Extract role from JWT (local operation — no HTTP call to Clerk) ───────
// Role is embedded in the JWT via Clerk session customization:
//   Dashboard → Sessions → Customize session token → { "role": "{{user.public_metadata.role}}" }

async function extractRoleFromJWT(request: FastifyRequest): Promise<string | null> {
  const header = request.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token || !CLERK_SECRET) return null

  try {
    // verifyToken() verifies the JWT signature locally using Clerk's public key.
    // It does NOT make an HTTP call to Clerk's API.
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET })

    // 'role' is the custom claim we added to the session token template
    return (payload as Record<string, unknown>).role as string | null
  } catch {
    // Token expired, invalid signature, or malformed — treat as unauthenticated
    return null
  }
}

// ── Middleware: Agent routes ───────────────────────────────────────────────
// Allows role: "agent" or role: "admin" (admins can test agent endpoints)

export async function requireAgent(request: FastifyRequest, reply: FastifyReply) {
  const role = await extractRoleFromJWT(request)

  if (!role) {
    return reply.code(401).send({
      error: 'Unauthorized — valid Clerk session token required',
      docs:  'Pass Authorization: Bearer <token> from useAuth().getToken()',
    })
  }

  if (role !== 'agent' && role !== 'admin') {
    return reply.code(403).send({
      error: 'Forbidden — agent role required',
    })
  }

  // Attach the agent's Clerk sub (userId) to the request for use in route handlers
  const header = request.headers.authorization!.slice(7)
  const payload = await verifyToken(header, { secretKey: CLERK_SECRET })
  ;(request as any).clerkUserId = payload.sub
}

// ── Middleware: Admin routes ───────────────────────────────────────────────
// Allows role: "admin" only

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const role = await extractRoleFromJWT(request)

  if (!role) {
    return reply.code(401).send({
      error: 'Unauthorized — valid Clerk session token required',
    })
  }

  if (role !== 'admin') {
    return reply.code(403).send({
      error: 'Forbidden — admin role required',
    })
  }

  const header = request.headers.authorization!.slice(7)
  const payload = await verifyToken(header, { secretKey: CLERK_SECRET })
  ;(request as any).clerkUserId = payload.sub
}

// ── Helper: Get agent's DB record from Clerk userId ───────────────────────
// Call this inside route handlers to get/create the Agent row in the DB

import { prisma } from './prisma.js'

export async function getOrCreateAgent(clerkUserId: string): Promise<string> {
  // Try to find existing agent
  const existing = await prisma.agent.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })

  if (existing) return existing.id

  // Auto-create agent row on first API call (lazy sync from Clerk)
  // This handles the case where the Clerk webhook hasn't fired yet
  const { clerkClient } = await import('@clerk/backend')
  const clerk = clerkClient({ secretKey: CLERK_SECRET })
  const user = await clerk.users.getUser(clerkUserId)

  const agent = await prisma.agent.create({
    data: {
      clerkUserId,
      name:  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.emailAddresses[0]?.emailAddress ?? 'Unknown',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      status: 'active',
    },
  })

  return agent.id
}
```

---

## How Routes Use This

```typescript
// In any route file:
import { requireAgent, requireAdmin, getOrCreateAgent } from '../lib/auth.js'

// Agent route example:
app.post('/properties', { preHandler: requireAgent }, async (request, reply) => {
  const clerkUserId = (request as any).clerkUserId
  const agentDbId   = await getOrCreateAgent(clerkUserId)
  // use agentDbId as the foreign key
})

// Admin route example:
app.get('/properties', { preHandler: requireAdmin }, async (request, reply) => {
  // admin sees all
})
```

---

## Setting Roles in Clerk

### Set a user as admin:
```bash
# From the Real-Estate repo — the set-admin-role script already exists
tsx apps/api/scripts/set-admin-role.ts <email>
```

### Set a user as agent (via invite):
The admin invite flow (`POST /agents/invite`) sets `publicMetadata: { role: "agent" }` automatically.

### Verify a role is set:
In Clerk Dashboard → Users → click user → "Metadata" tab → Public Metadata should show:
```json
{ "role": "agent" }
```

---

## Verification

Create a test script `apps/api/src/routes/health.ts` and add a protected test route temporarily:

```
GET /api/v1/auth-test   (preHandler: requireAgent)
```

Test with no token:
```bash
curl http://localhost:4001/api/v1/auth-test
# → 401 Unauthorized
```

Test with invalid token:
```bash
curl -H "Authorization: Bearer garbage" http://localhost:4001/api/v1/auth-test
# → 401 Unauthorized
```

Test with valid agent token (get from Clerk dashboard → API Keys → generate test token):
```bash
curl -H "Authorization: Bearer <valid_token>" http://localhost:4001/api/v1/auth-test
# → 200 OK
```

Remove the test route after verifying.

**✓ Phase 2, File 01 complete. Proceed to `02_api/02_cloudinary_signing.md`.**
