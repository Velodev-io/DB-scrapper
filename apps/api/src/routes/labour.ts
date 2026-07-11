import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAgent, requireAdmin, getOrCreateAgent } from '../lib/auth.js'
import { serializeLabour } from '../lib/serialize.js'

export default async function labourRoutes(app: FastifyInstance) {

  // POST /labour — agent submits a labour profile
  app.post('/labour', { preHandler: requireAgent,
    schema: { tags: ['Labour'], summary: 'Submit a labour profile (agent)', security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['fullName', 'age', 'gender', 'skillLevel', 'phone'],
        properties: {
          fullName: {type:'string'}, age: {type:'integer'}, gender: {type:'string'},
          skillLevel: {type:'string'}, skillType: {type:'string'}, phone: {type:'string'},
          profilePhotoUrl: {type:'string'}, houseNo: {type:'string'}, street: {type:'string'},
          locality: {type:'string'}, city: {type:'string'}, pincode: {type:'string'},
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)
    const row = await prisma.labour.create({
      data: {
        ...body,
        agentId,
        reviewStatus: 'pending',
      },
      include: { agent: { select: { id: true, name: true, email: true } } },
    })
    return reply.code(201).send(serializeLabour(row))
  })

  // GET /labour/mine — agent's own submissions
  app.get('/labour/mine', { preHandler: requireAgent,
    schema: { tags: ['Labour'], summary: 'List my submitted labour profiles (agent)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: { page: {type:'integer',default:1}, limit: {type:'integer',default:20} } }
    }
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query as any
    const clerkUserId = (request as any).clerkUserId
    const agent = await prisma.agent.findUnique({ where: { clerkUserId }, select: { id: true } })
    if (!agent) return { data: [], total: 0, page, limit }
    const where = { agentId: agent.id, reviewStatus: { not: 'deleted' } }
    const [rows, total] = await Promise.all([
      prisma.labour.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.labour.count({ where }),
    ])
    return { data: rows.map(serializeLabour), total, page, limit }
  })

  // GET /labour — admin sees all (with filters)
  app.get('/labour', { preHandler: requireAdmin,
    schema: { tags: ['Labour'], summary: 'List all labour profiles (admin)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: {
        agentId: {type:'string'}, reviewStatus: {type:'string'}, gender: {type:'string'},
        skillLevel: {type:'string'}, skillType: {type:'string'}, city: {type:'string'},
        page: {type:'integer',default:1}, limit: {type:'integer',default:20},
      }}
    }
  }, async (request) => {
    const q = request.query as any
    const page = Number(q.page ?? 1), limit = Number(q.limit ?? 20)
    const where: any = {}
    if (q.agentId)      where.agentId      = q.agentId
    if (q.reviewStatus) where.reviewStatus  = q.reviewStatus
    if (q.gender)       where.gender       = q.gender
    if (q.skillLevel)   where.skillLevel   = q.skillLevel
    if (q.skillType)    where.skillType    = q.skillType
    if (q.city)         where.city          = { contains: q.city, mode: 'insensitive' }
    const [rows, total] = await Promise.all([
      prisma.labour.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.labour.count({ where }),
    ])
    return { data: rows.map(serializeLabour), total, page, limit }
  })

  // PATCH /labour/:id — admin updates reviewStatus
  app.patch('/labour/:id', { preHandler: requireAdmin,
    schema: { tags: ['Labour'], summary: 'Update labour profile review status (admin)', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: {type:'string'} }, required: ['id'] },
      body: { type: 'object', properties: { reviewStatus: {type:'string', enum:['pending','reviewed','deleted']} } }
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const { reviewStatus } = request.body as any
    try {
      const row = await prisma.labour.update({ where: { id }, data: { reviewStatus },
        include: { agent: { select: { id: true, name: true, email: true } } } })
      return serializeLabour(row)
    } catch { return reply.code(404).send({ error: 'Labour record not found' }) }
  })

  // DELETE /labour/:id — admin hard deletes
  app.delete('/labour/:id', { preHandler: requireAdmin,
    schema: { tags: ['Labour'], summary: 'Delete a labour record (admin)', security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await prisma.labour.delete({ where: { id } })
      return { deleted: true }
    } catch { return reply.code(404).send({ error: 'Labour record not found' }) }
  })
}
