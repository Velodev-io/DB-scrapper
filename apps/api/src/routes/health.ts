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
          503: {
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
