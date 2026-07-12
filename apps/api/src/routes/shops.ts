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
          images:      { type: 'array', items: { type: 'string' } },
          id:          { type: 'string' },   // client-generated idempotency key
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)

    const { id: clientId, shopName, shopType, keeperName, keeperPhone, address, lat, lng, images } = body

    const data: any = {
      shopName, shopType, keeperName, keeperPhone,
      address: address || null,
      lat:     lat     ?? null,
      lng:     lng     ?? null,
      images:  images  ?? [],
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

  // PATCH /shops/:id/agent — agent edits their own shop record
  app.patch('/shops/:id/agent', { preHandler: requireAgent,
    schema: { tags: ['Shops'], summary: 'Agent edits their own shop submission', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      body: { type: 'object', properties: {
        shopName:    { type: 'string' },
        shopType:    { type: 'string' },
        keeperName:  { type: 'string' },
        keeperPhone: { type: 'string' },
        address:     { type: 'string' },
        lat:         { type: 'number' },
        lng:         { type: 'number' },
        images:      { type: 'array', items: { type: 'string' } },
      }}
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const clerkUserId = (request as any).clerkUserId
    const existing = await prisma.shop.findFirst({
      where: { id, agent: { clerkUserId } },
      select: { id: true },
    })
    if (!existing) return reply.code(404).send({ error: 'Shop record not found or not yours' })

    const body = request.body as any
    const { shopName, shopType, keeperName, keeperPhone, address, lat, lng, images } = body
    const data: any = { reviewStatus: 'pending' }
    if (shopName    !== undefined) data.shopName    = shopName
    if (shopType    !== undefined) data.shopType    = shopType
    if (keeperName  !== undefined) data.keeperName  = keeperName
    if (keeperPhone !== undefined) data.keeperPhone = keeperPhone
    if (address     !== undefined) data.address     = address
    if (lat         !== undefined) data.lat         = lat
    if (lng         !== undefined) data.lng         = lng
    if (images      !== undefined) data.images      = images
    try {
      const row = await prisma.shop.update({
        where: { id }, data,
        include: { agent: { select: { id: true, name: true, email: true } } },
      })
      return serializeShop(row)
    } catch { return reply.code(500).send({ error: 'Failed to update shop record' }) }
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
