# Phase 2 — File 00: Fastify Server Setup

> **Antigravity Instructions:** Build the complete Fastify server with Swagger, CORS, rate limiting, and Sentry. This is the entry point for all API routes. Build it completely before adding routes.

---

## What You Are Building

`apps/api/src/server.ts` — the Fastify server with:
- Swagger/OpenAPI UI at `http://localhost:4001/api/docs`
- CORS configured for agent (5181) and admin (5182) apps
- Rate limiting: 120 req/min per IP
- Sentry error tracking
- All routes registered under `/api/v1` prefix
- `GET /health` health check

---

## File: apps/api/src/server.ts

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import * as Sentry from '@sentry/node'

import healthRoutes from './routes/health.js'
import propertyRoutes from './routes/properties.js'
import projectRoutes from './routes/projects.js'
import labourRoutes from './routes/labour.js'
import agentRoutes from './routes/agents.js'
import uploadsRoutes from './routes/uploads.js'

const PORT = Number(process.env.PORT ?? 4001)
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5181,http://localhost:5182,capacitor://localhost,http://localhost')
  .split(',')
  .map(s => s.trim())

// ── Sentry (error tracking) ──────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.2,  // 20% of requests traced (keeps free tier usage low)
  })
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
    requestTimeout: 30_000,  // 30s — protects against hanging Clerk/Cloudinary calls
  })

  // ── CORS ────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // ── Rate Limiting ────────────────────────────────────────────────────
  // 120 requests/minute per IP — protects against accidental form storms from 50 agents
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too many requests — slow down and try again in a minute',
      statusCode: 429,
    }),
  })

  // ── Swagger / OpenAPI ────────────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      info: {
        title:       'Carry Construction — Field Ops API',
        description: 'Internal API for field agents. All routes require a Clerk JWT Bearer token.',
        version:     '1.0.0',
        contact: {
          name: 'Carry Construction Dev',
        },
      },
      servers: [
        { url: `http://localhost:${PORT}`, description: 'Local development' },
        { url: 'https://carry-api.vercel.app', description: 'Production (Vercel)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type:        'http',
            scheme:      'bearer',
            bearerFormat: 'Clerk JWT',
            description: 'Obtain from Clerk useAuth().getToken() in the frontend apps',
          },
        },
      },
      tags: [
        { name: 'System',     description: 'Health and utility endpoints' },
        { name: 'Properties', description: 'Property data collection' },
        { name: 'Projects',   description: 'Construction project data collection' },
        { name: 'Labour',     description: 'Labour worker profiles' },
        { name: 'Agents',     description: 'Agent user management (admin only)' },
        { name: 'Uploads',    description: 'Cloudinary signed upload management' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking:  true,
      tryItOutEnabled: true,
    },
    theme: {
      title: 'Carry Field Ops API',
    },
  })

  // ── Health (no prefix) ───────────────────────────────────────────────
  await app.register(healthRoutes)

  // ── All API routes under /api/v1 ─────────────────────────────────────
  await app.register(async (api) => {
    await api.register(propertyRoutes)
    await api.register(projectRoutes)
    await api.register(labourRoutes)
    await api.register(agentRoutes)
    await api.register(uploadsRoutes)
  }, { prefix: '/api/v1' })

  // ── Global error handler with Sentry ────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error)
    }
    app.log.error(error)

    const statusCode = error.statusCode ?? 500
    reply.code(statusCode).send({
      error:      statusCode >= 500 ? 'Internal server error' : error.message,
      statusCode,
    })
  })

  return app
}

// ── Entry point ─────────────────────────────────────────────────────────
async function main() {
  const app = await buildApp()
  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`✓ API           → http://localhost:${PORT}/api/v1`)
  app.log.info(`✓ Swagger UI    → http://localhost:${PORT}/api/docs`)
  app.log.info(`✓ Health check  → http://localhost:${PORT}/health`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

---

## File: apps/api/src/routes/health.ts

```typescript
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export default async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Health check — confirms API and DB are live',
        response: {
          200: {
            type: 'object',
            properties: {
              ok:        { type: 'boolean' },
              service:   { type: 'string' },
              version:   { type: 'string' },
              timestamp: { type: 'string' },
              db:        { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      // Verify DB connection is live
      let dbStatus = 'connected'
      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        dbStatus = 'disconnected'
        reply.code(503)
      }

      return {
        ok:        dbStatus === 'connected',
        service:   'carry-api',
        version:   '1.0.0',
        timestamp: new Date().toISOString(),
        db:        dbStatus,
      }
    }
  )
}
```

---

## Swagger UI Access

Once the server starts, visit:

**`http://localhost:4001/api/docs`**

You will see a fully interactive API explorer with:
- All routes listed by tag
- Try It Out buttons for testing
- Bearer token input for authenticated routes
- Request/response schemas for every endpoint

---

## Verification

```bash
npm run dev:api
```

Verify all three URLs respond:

1. `curl http://localhost:4001/health`
   → `{"ok":true,"service":"carry-api","version":"1.0.0","db":"connected"}`

2. Open `http://localhost:4001/api/docs` in browser
   → Swagger UI loads with Carry Field Ops API title

3. All 6 route groups visible in Swagger: System, Properties, Projects, Labour, Agents, Uploads

**✓ Phase 2, File 00 complete. Proceed to `02_api/01_auth_middleware.md`.**
