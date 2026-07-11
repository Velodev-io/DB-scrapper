# Phase 2 — Files 03–06: API Routes + Vercel Adapter

> **Antigravity Instructions:** This file covers the remaining 4 API route files and the Vercel adapter. Build them all in this session.

---

## File 03: apps/api/src/routes/properties.ts

```typescript
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAgent, requireAdmin, getOrCreateAgent } from '../lib/auth.js'
import { serializeProperty } from '../lib/serialize.js'

export default async function propertyRoutes(app: FastifyInstance) {

  // POST /properties — agent submits a property
  app.post('/properties', { preHandler: requireAgent,
    schema: { tags: ['Properties'], summary: 'Submit a property (agent)', security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['title','propertyType','listingType','priceInr','priceLabel','areaSqft','locality','city','status'],
        properties: {
          title: {type:'string'}, propertyType: {type:'string'}, listingType: {type:'string'},
          bhk: {type:'integer'}, priceInr: {type:'integer'}, priceLabel: {type:'string'},
          areaSqft: {type:'integer'}, locality: {type:'string'}, city: {type:'string'},
          address: {type:'string'}, reraNumber: {type:'string'}, status: {type:'string'},
          furnishing: {type:'string'}, description: {type:'string'},
          images: {type:'array', items:{type:'string'}},
          floorPlanUrl: {type:'string'}, lat: {type:'number'}, lng: {type:'number'},
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)
    const row = await prisma.property.create({
      data: { ...body, agentId, images: body.images ?? [], reviewStatus: 'pending' },
      include: { agent: { select: { id: true, name: true, email: true } } },
    })
    return reply.code(201).send(serializeProperty(row))
  })

  // GET /properties/mine — agent's own submissions
  app.get('/properties/mine', { preHandler: requireAgent,
    schema: { tags: ['Properties'], summary: 'List my submitted properties (agent)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: { page: {type:'integer',default:1}, limit: {type:'integer',default:20} } }
    }
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query as any
    const clerkUserId = (request as any).clerkUserId
    const agent = await prisma.agent.findUnique({ where: { clerkUserId }, select: { id: true } })
    if (!agent) return { data: [], total: 0, page, limit }
    const where = { agentId: agent.id, reviewStatus: { not: 'deleted' } }
    const [rows, total] = await Promise.all([
      prisma.property.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.property.count({ where }),
    ])
    return { data: rows.map(serializeProperty), total, page, limit }
  })

  // GET /properties — admin sees all (with filters)
  app.get('/properties', { preHandler: requireAdmin,
    schema: { tags: ['Properties'], summary: 'List all property submissions (admin)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: {
        agentId: {type:'string'}, reviewStatus: {type:'string'}, listingType: {type:'string'},
        propertyType: {type:'string'}, city: {type:'string'},
        page: {type:'integer',default:1}, limit: {type:'integer',default:20},
      }}
    }
  }, async (request) => {
    const q = request.query as any
    const page = Number(q.page ?? 1), limit = Number(q.limit ?? 20)
    const where: any = {}
    if (q.agentId)      where.agentId      = q.agentId
    if (q.reviewStatus) where.reviewStatus  = q.reviewStatus
    if (q.listingType)  where.listingType   = q.listingType
    if (q.propertyType) where.propertyType  = q.propertyType
    if (q.city)         where.city          = { contains: q.city, mode: 'insensitive' }
    const [rows, total] = await Promise.all([
      prisma.property.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.property.count({ where }),
    ])
    return { data: rows.map(serializeProperty), total, page, limit }
  })

  // PATCH /properties/:id — admin updates reviewStatus
  app.patch('/properties/:id', { preHandler: requireAdmin,
    schema: { tags: ['Properties'], summary: 'Update property review status (admin)', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: {type:'string'} }, required: ['id'] },
      body: { type: 'object', properties: { reviewStatus: {type:'string', enum:['pending','reviewed','deleted']} } }
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const { reviewStatus } = request.body as any
    try {
      const row = await prisma.property.update({ where: { id }, data: { reviewStatus },
        include: { agent: { select: { id: true, name: true, email: true } } } })
      return serializeProperty(row)
    } catch { return reply.code(404).send({ error: 'Property not found' }) }
  })

  // DELETE /properties/:id — admin hard deletes
  app.delete('/properties/:id', { preHandler: requireAdmin,
    schema: { tags: ['Properties'], summary: 'Delete a property record (admin)', security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await prisma.property.delete({ where: { id } })
      return { deleted: true }
    } catch { return reply.code(404).send({ error: 'Property not found' }) }
  })
}
```

---

## File 04: apps/api/src/routes/projects.ts

Follow the exact same pattern as `properties.ts` but for `ConstructionProject`:

- `POST /projects` — agent submits, fields: `title, category, location, areaSqft, durationMonths, packageTier, description, beforeImages[], afterImages[], stageImages[]`
- `GET /projects/mine` — agent's own, ordered by createdAt desc
- `GET /projects` — admin all, filters: `agentId, reviewStatus, category, packageTier`
- `PATCH /projects/:id` — admin updates reviewStatus
- `DELETE /projects/:id` — admin hard deletes

Use `serializeProject()` from `serialize.ts`.

---

## File 05: apps/api/src/routes/labour.ts

Same pattern for `Labour`:

- `POST /labour` — agent submits, fields: `fullName, age, gender, skillLevel, skillType, phone, profilePhotoUrl, houseNo, street, locality, city, pincode`
- `GET /labour/mine` — agent's own
- `GET /labour` — admin all, filters: `agentId, reviewStatus, gender, skillLevel, skillType, city`
- `PATCH /labour/:id` — admin updates reviewStatus
- `DELETE /labour/:id` — admin hard deletes

Use `serializeLabour()`.

---

## File 06: apps/api/src/routes/agents.ts

```typescript
import type { FastifyInstance } from 'fastify'
import { createClerkClient } from '@clerk/backend'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export default async function agentRoutes(app: FastifyInstance) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

  // GET /agents — list all Clerk users with role: agent
  app.get('/agents', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'List all agent users (admin)', security: [{ bearerAuth: [] }] }
  }, async () => {
    const { data: users } = await clerk.users.getUserList({ limit: 200 })
    return users
      .filter(u => u.publicMetadata?.role === 'agent')
      .map(u => ({
        id:           u.id,
        name:         `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'Unknown',
        email:        u.emailAddresses[0]?.emailAddress ?? '',
        status:       'active',
        createdAt:    new Date(u.createdAt).toISOString(),
      }))
  })

  // GET /agents/invitations — list pending invitations
  app.get('/agents/invitations', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'List pending agent invitations (admin)', security: [{ bearerAuth: [] }] }
  }, async () => {
    const { data: invitations } = await clerk.invitations.getInvitationList({ status: 'pending' })
    return invitations
      .filter((inv: any) => inv.publicMetadata?.role === 'agent')
      .map((inv: any) => ({
        id:        inv.id,
        email:     inv.emailAddress,
        status:    'pending',
        createdAt: new Date(inv.createdAt).toISOString(),
      }))
  })

  // POST /agents/invite — invite a new agent by email
  app.post('/agents/invite', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'Invite a new agent by email (admin)', security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }
    }
  }, async (request, reply) => {
    const { email } = request.body as { email: string }
    try {
      await clerk.invitations.createInvitation({
        emailAddress:   email,
        publicMetadata: { role: 'agent' },
        redirectUrl:    process.env.AGENT_APP_URL ?? 'https://carry-agent.web.app',
      })
      return { invited: true, email }
    } catch (err: any) {
      return reply.code(400).send({ error: err.message ?? 'Failed to send invitation' })
    }
  })

  // DELETE /agents/:clerkUserId — revoke agent access
  app.delete('/agents/:clerkUserId', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'Revoke agent access (admin)', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { clerkUserId: { type: 'string' } }, required: ['clerkUserId'] }
    }
  }, async (request, reply) => {
    const { clerkUserId } = request.params as { clerkUserId: string }
    try {
      await clerk.users.updateUserMetadata(clerkUserId, { publicMetadata: { role: null } })
      // Also mark as revoked in local DB
      await prisma.agent.updateMany({ where: { clerkUserId }, data: { status: 'revoked' } })
      return { revoked: true }
    } catch (err: any) {
      return reply.code(404).send({ error: 'Agent not found' })
    }
  })
}
```

---

## File 07: Vercel Adapter (apps/api/src/vercel.ts)

> **See `06_deployment/02_vercel_deploy.md` for the full Vercel adapter code.**
> Build it now anyway so the server.ts export is ready:

In `apps/api/src/server.ts`, wrap the `main()` call:

```typescript
// Only run the HTTP server when NOT deployed on Vercel
if (process.env.VERCEL !== '1') {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

Export `buildApp` from `server.ts`:
```typescript
export { buildApp }
```

---

## Verification — All Routes in Swagger

Start the API:
```bash
npm run dev:api
```

Open `http://localhost:4001/api/docs`

Verify these route groups appear with all endpoints:
- **System**: GET /health
- **Properties**: POST, GET/mine, GET (admin), PATCH (admin), DELETE (admin)
- **Projects**: same pattern
- **Labour**: same pattern
- **Agents**: GET, GET/invitations, POST/invite, DELETE/:clerkUserId
- **Uploads**: GET/sign, PATCH/patch-queued

**✓ Phase 2 fully complete. Proceed to `03_images/00_compress.md`.**
