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
          id: {type:'string'},
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)

    try {
      const row = await prisma.property.create({
        data: { ...body, agentId, images: body.images ?? [], reviewStatus: 'pending' },
        include: { agent: { select: { id: true, name: true, email: true } } },
      })
      return reply.code(201).send(serializeProperty(row))
    } catch (err: any) {
      // Prisma unique constraint violation code is P2002
      if (err.code === 'P2002' && body.id) {
        const existing = await prisma.property.findUnique({
          where: { id: body.id },
          include: { agent: { select: { id: true, name: true, email: true } } },
        })
        if (existing) {
          return reply.code(200).send(serializeProperty(existing))
        }
      }
      throw err
    }
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
