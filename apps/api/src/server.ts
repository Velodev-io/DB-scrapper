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
import shopRoutes from './routes/shops.js'
import agentRoutes from './routes/agents.js'
import uploadsRoutes from './routes/uploads.js'
import webhookRoutes from './routes/webhooks.js'

const PORT = Number(process.env.PORT ?? 4001)

// CORS_ORIGIN can be a comma-separated list of exact origins.
// We also build an explicit set and use a dynamic function so that
// mismatches (trailing slash, wrong port) are immediately visible in logs
// rather than silently returning a 403 preflight error.
const CORS_ORIGIN_SET = new Set(
  (process.env.CORS_ORIGIN ?? 'http://localhost:5181,http://localhost:5182,capacitor://localhost,http://localhost')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

function isCorsAllowed(origin: string): boolean {
  if (CORS_ORIGIN_SET.has(origin)) return true
  // In development: allow any LAN IP (192.168.x.x or 10.x.x.x) on any port —
  // avoids having to update CORS_ORIGIN every time the dev machine's IP changes.
  if (process.env.NODE_ENV !== 'production') {
    if (/^http:\/\/(192\.168\.|10\.)/.test(origin)) return true
  }
  return false
}

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
    origin: (origin, cb) => {
      // No origin header = server-to-server / curl — allow
      if (!origin) return cb(null, true)
      if (isCorsAllowed(origin)) return cb(null, true)
      app.log.warn({ origin }, 'CORS rejected origin')
      cb(new Error(`CORS: origin '${origin}' not allowed`), false)
    },
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

  // ── Swagger / OpenAPI — dev only ────────────────────────────────────
  // Never expose interactive docs in production (leaks endpoint schema + allows unauthenticated probing)
  if (process.env.NODE_ENV !== 'production') {
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
          { name: 'Shops',      description: 'Shop / vendor records near sites' },
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
  }

  // ── Health (no prefix) ───────────────────────────────────────────────
  await app.register(healthRoutes)

  // ── All API routes under /api/v1 ─────────────────────────────────────
  await app.register(async (api) => {
    await api.register(propertyRoutes)
    await api.register(projectRoutes)
    await api.register(labourRoutes)
    await api.register(shopRoutes)
    await api.register(agentRoutes)
    await api.register(uploadsRoutes)
    await api.register(webhookRoutes)
  }, { prefix: '/api/v1' })

  // ── Global error handler with Sentry ────────────────────────────────
  app.setErrorHandler((error: any, request, reply) => {
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

// Only run the HTTP server when NOT deployed on Vercel
if (process.env.VERCEL !== '1') {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
