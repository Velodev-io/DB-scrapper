import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAgent, requireAdmin, getOrCreateAgent } from '../lib/auth.js'
import { serializeShop } from '../lib/serialize.js'

export default async function shopRoutes(app: FastifyInstance) {

  // POST /shops — agent submits a shop record
  app.post('/shops', { preHandler: requireAgent,
    schema: { tags: ['Shops'], summary: 'Submit a shop record (agent)', security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['shopName', 'shopType', 'keeperName', 'keeperPhone'],
        properties: {
          shopName:    { type: 'string' },
          shopType:    { type: 'string' },
          keeperName:  { type: 'string' },
          keeperPhone: { type: 'string' },
          address:     { type: 'string' },
          lat:         { type: 'number' },
          lng:         { type: 'number' },
          id:          { type: 'string' },   // client-generated idempotency key
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)

    const { id: clientId, shopName, shopType, keeperName, keeperPhone, address, lat, lng } = body

    const data: any = {
      shopName, shopType, keeperName, keeperPhone,
      address: address || null,
      lat:     lat     ?? null,
      lng:     lng     ?? null,
      agentId,
      reviewStatus: 'pending',
    }

    // Support idempotent client-side IDs (offline queue replay)
    if (clientId) data.id = clientId

    try {
      const row = await prisma.shop.create({
        data,
        include: { agent: { select: { id: true, name: true, email: true } } },
      })
      return reply.code(201).send(serializeShop(row))
    } catch (err: any) {
      // P2002 = unique constraint — idempotent replay for offline queue
      if (err.code === 'P2002' && clientId) {
        const existing = await prisma.shop.findUnique({
          where: { id: clientId },
          include: { agent: { select: { id: true, name: true, email: true } } },
        })
        if (existing) return reply.code(200).send(serializeShop(existing))
      }
      throw err
    }
  })

  // GET /shops/mine — agent's own submissions
  app.get('/shops/mine', { preHandler: requireAgent,
    schema: { tags: ['Shops'], summary: "List my submitted shops (agent)", security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: {
        page:  { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
      }}
    }
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query as any
    const clerkUserId = (request as any).clerkUserId
    const agent = await prisma.agent.findUnique({ where: { clerkUserId }, select: { id: true } })
    if (!agent) return { data: [], total: 0, page, limit }
    const where = { agentId: agent.id, reviewStatus: { not: 'deleted' } }
    const [rows, total] = await Promise.all([
      prisma.shop.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.shop.count({ where }),
    ])
    return { data: rows.map(serializeShop), total, page, limit }
  })

  // GET /shops — admin: all shops with filters
  app.get('/shops', { preHandler: requireAdmin,
    schema: { tags: ['Shops'], summary: 'List all shops (admin)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: {
        agentId:      { type: 'string' },
        reviewStatus: { type: 'string' },
        shopType:     { type: 'string' },
        page:         { type: 'integer', default: 1 },
        limit:        { type: 'integer', default: 20 },
      }}
    }
  }, async (request) => {
    const q = request.query as any
    const page  = Number(q.page  ?? 1)
    const limit = Math.min(Number(q.limit ?? 20), 100)
    const where: any = {}
    if (q.agentId)      where.agentId      = q.agentId
    if (q.reviewStatus) where.reviewStatus  = q.reviewStatus
    if (q.shopType)     where.shopType      = { contains: q.shopType, mode: 'insensitive' }
    const [rows, total] = await Promise.all([
      prisma.shop.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.shop.count({ where }),
    ])
    return { data: rows.map(serializeShop), total, page, limit }
  })

  // PATCH /shops/:id — admin updates reviewStatus
  app.patch('/shops/:id', { preHandler: requireAdmin,
    schema: { tags: ['Shops'], summary: 'Update shop review status (admin)', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      body:   { type: 'object', properties: { reviewStatus: { type: 'string', enum: ['pending', 'reviewed', 'deleted'] } } },
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const { reviewStatus } = request.body as any
    try {
      const row = await prisma.shop.update({
        where: { id }, data: { reviewStatus },
        include: { agent: { select: { id: true, name: true, email: true } } },
      })
      return serializeShop(row)
    } catch { return reply.code(404).send({ error: 'Shop record not found' }) }
  })

  // DELETE /shops/:id — admin hard deletes
  app.delete('/shops/:id', { preHandler: requireAdmin,
    schema: { tags: ['Shops'], summary: 'Delete a shop record (admin)', security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await prisma.shop.delete({ where: { id } })
      return { deleted: true }
    } catch { return reply.code(404).send({ error: 'Shop record not found' }) }
  })
}
