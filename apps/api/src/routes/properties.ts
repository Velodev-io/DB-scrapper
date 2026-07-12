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
          securityDeposit: {type:'integer'},
          availableFrom: {type:'string'},
          preferredTenant: {type:'string'},
          petFriendly: {type:'boolean'},
          maintenanceCharges: {type:'integer'},
          leaseDuration: {type:'integer'},
          lockInPeriod: {type:'integer'},
          camCharges: {type:'integer'},
          plotAllowedUse: {type:'string'},
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)

    // Destructure only schema-allowed fields (never let client set agentId, reviewStatus, or pick their own id)
    const { id: clientId, title, propertyType, listingType, bhk, priceInr, priceLabel,
            areaSqft, locality, city, address, reraNumber, status, furnishing,
            description, images, floorPlanUrl, lat, lng,
            securityDeposit, availableFrom, preferredTenant, petFriendly, maintenanceCharges,
            leaseDuration, lockInPeriod, camCharges, plotAllowedUse } = body

    const data: any = {
      title, propertyType, listingType, bhk, priceInr, priceLabel, areaSqft,
      locality, city, address, reraNumber, status, furnishing, description,
      images: images ?? [], floorPlanUrl, lat, lng, agentId, reviewStatus: 'pending',
      securityDeposit, availableFrom, preferredTenant, petFriendly, maintenanceCharges,
      leaseDuration, lockInPeriod, camCharges, plotAllowedUse,
    }

    try {
      const row = await prisma.property.create({
        data,
        include: { agent: { select: { id: true, name: true, email: true } } },
      })
      return reply.code(201).send(serializeProperty(row))
    } catch (err: any) {
      // Prisma unique constraint violation code is P2002 — idempotent retry using client-provided id
      if (err.code === 'P2002' && clientId) {
        const existing = await prisma.property.findUnique({
          where: { id: clientId },
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
    const page = Number(q.page ?? 1), limit = Math.min(Number(q.limit ?? 20), 100)
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

  // PATCH /properties/:id/agent — agent edits their own property
  app.patch('/properties/:id/agent', { preHandler: requireAgent,
    schema: { tags: ['Properties'], summary: 'Agent edits their own property submission', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: {type:'string'} }, required: ['id'] },
      body: { type: 'object', properties: {
        title: {type:'string'}, propertyType: {type:'string'}, listingType: {type:'string'},
        bhk: {type:'integer'}, priceInr: {type:'integer'}, priceLabel: {type:'string'},
        areaSqft: {type:'integer'}, locality: {type:'string'}, city: {type:'string'},
        address: {type:'string'}, reraNumber: {type:'string'}, status: {type:'string'},
        furnishing: {type:'string'}, description: {type:'string'},
        images: {type:'array', items:{type:'string'}},
        floorPlanUrl: {type:'string'}, lat: {type:'number'}, lng: {type:'number'},
      }}
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const clerkUserId = (request as any).clerkUserId
    // Verify ownership
    const existing = await prisma.property.findFirst({
      where: { id, agent: { clerkUserId } },
      select: { id: true },
    })
    if (!existing) return reply.code(404).send({ error: 'Property not found or not yours' })

    const body = request.body as any
    // Strip immutable fields — only update what the agent sent
    const { title, propertyType, listingType, bhk, priceInr, priceLabel,
            areaSqft, locality, city, address, reraNumber, status, furnishing,
            description, images, floorPlanUrl, lat, lng } = body
    const data: any = { reviewStatus: 'pending' }
    if (title         !== undefined) data.title         = title
    if (propertyType  !== undefined) data.propertyType  = propertyType
    if (listingType   !== undefined) data.listingType   = listingType
    if (bhk           !== undefined) data.bhk           = bhk
    if (priceInr      !== undefined) data.priceInr      = priceInr
    if (priceLabel    !== undefined) data.priceLabel    = priceLabel
    if (areaSqft      !== undefined) data.areaSqft      = areaSqft
    if (locality      !== undefined) data.locality      = locality
    if (city          !== undefined) data.city          = city
    if (address       !== undefined) data.address       = address
    if (reraNumber    !== undefined) data.reraNumber    = reraNumber
    if (status        !== undefined) data.status        = status
    if (furnishing    !== undefined) data.furnishing    = furnishing
    if (description   !== undefined) data.description   = description
    if (images        !== undefined) data.images        = images
    if (floorPlanUrl  !== undefined) data.floorPlanUrl  = floorPlanUrl
    if (lat           !== undefined) data.lat           = lat
    if (lng           !== undefined) data.lng           = lng
    try {
      const row = await prisma.property.update({ where: { id }, data,
        include: { agent: { select: { id: true, name: true, email: true } } } })
      return serializeProperty(row)
    } catch { return reply.code(500).send({ error: 'Failed to update property' }) }
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
