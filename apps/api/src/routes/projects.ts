import type { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { requireAgent, requireAdmin, getOrCreateAgent } from '../lib/auth.js'
import { serializeProject } from '../lib/serialize.js'

export default async function projectRoutes(app: FastifyInstance) {

  // POST /projects — agent submits a project
  app.post('/projects', { preHandler: requireAgent,
    schema: { tags: ['Projects'], summary: 'Submit a project (agent)', security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['title', 'category', 'location'],
        properties: {
          title: {type:'string'}, category: {type:'string'}, location: {type:'string'},
          areaSqft: {type:'integer'}, durationMonths: {type:'integer'}, packageTier: {type:'string'},
          description: {type:'string'},
          beforeImages: {type:'array', items:{type:'string'}},
          afterImages: {type:'array', items:{type:'string'}},
          stageImages: {type:'array', items:{type:'string'}},
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any
    const clerkUserId = (request as any).clerkUserId
    const agentId = await getOrCreateAgent(clerkUserId)

    // Destructure only schema-allowed fields
    const { title, category, location, areaSqft, durationMonths, packageTier,
            description, beforeImages, afterImages, stageImages } = body

    const id = crypto.randomBytes(12).toString('hex')
    const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const slug = `${cleanSlug}-${id.slice(-4)}`

    const row = await prisma.constructionProject.create({
      data: {
        id,
        slug,
        title, category, location, areaSqft, durationMonths, packageTier, description,
        beforeImages: beforeImages ?? [],
        afterImages:  afterImages  ?? [],
        stageImages:  stageImages  ?? [],
        agentId, reviewStatus: 'pending',
      },
      include: { agent: { select: { id: true, name: true, email: true } } },
    })
    return reply.code(201).send(serializeProject(row))
  })

  // GET /projects/mine — agent's own submissions
  app.get('/projects/mine', { preHandler: requireAgent,
    schema: { tags: ['Projects'], summary: 'List my submitted projects (agent)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: { page: {type:'integer',default:1}, limit: {type:'integer',default:20} } }
    }
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query as any
    const clerkUserId = (request as any).clerkUserId
    const agent = await prisma.agent.findUnique({ where: { clerkUserId }, select: { id: true } })
    if (!agent) return { data: [], total: 0, page, limit }
    const where = { agentId: agent.id, reviewStatus: { not: 'deleted' } }
    const [rows, total] = await Promise.all([
      prisma.constructionProject.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.constructionProject.count({ where }),
    ])
    return { data: rows.map(serializeProject), total, page, limit }
  })

  // GET /projects — admin sees all (with filters)
  app.get('/projects', { preHandler: requireAdmin,
    schema: { tags: ['Projects'], summary: 'List all project submissions (admin)', security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: {
        agentId: {type:'string'}, reviewStatus: {type:'string'}, category: {type:'string'},
        packageTier: {type:'string'},
        page: {type:'integer',default:1}, limit: {type:'integer',default:20},
      }}
    }
  }, async (request) => {
    const q = request.query as any
    const page = Number(q.page ?? 1), limit = Math.min(Number(q.limit ?? 20), 100)
    const where: any = {}
    if (q.agentId)      where.agentId      = q.agentId
    if (q.reviewStatus) where.reviewStatus  = q.reviewStatus
    if (q.category)     where.category     = q.category
    if (q.packageTier)  where.packageTier  = q.packageTier
    const [rows, total] = await Promise.all([
      prisma.constructionProject.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { agent: { select: { id: true, name: true, email: true } } } }),
      prisma.constructionProject.count({ where }),
    ])
    return { data: rows.map(serializeProject), total, page, limit }
  })

  // PATCH /projects/:id — admin updates reviewStatus and other details
  app.patch('/projects/:id', { preHandler: requireAdmin,
    schema: { tags: ['Projects'], summary: 'Update project review status and details (admin)', security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: {type:'string'} }, required: ['id'] },
      body: { type: 'object', properties: {
        reviewStatus: {type:'string', enum:['pending','reviewed','deleted']},
        published: {type:'boolean'},
        title: {type:'string'}, category: {type:'string'}, location: {type:'string'},
        areaSqft: {type:'integer'}, durationMonths: {type:'integer'}, packageTier: {type:'string'},
        description: {type:'string'},
        beforeImages: {type:'array', items:{type:'string'}},
        afterImages: {type:'array', items:{type:'string'}},
        stageImages: {type:'array', items:{type:'string'}},
      } }
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const { reviewStatus, published, title, category, location, areaSqft, durationMonths, packageTier, description,
            beforeImages, afterImages, stageImages } = body
    const data: any = {}
    if (reviewStatus !== undefined) data.reviewStatus = reviewStatus
    if (published !== undefined) data.published = published
    if (title !== undefined) {
      data.title = title
      data.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(-4)
    }
    if (category !== undefined) data.category = category
    if (location !== undefined) data.location = location
    if (areaSqft !== undefined) data.areaSqft = areaSqft
    if (durationMonths !== undefined) data.durationMonths = durationMonths
    if (packageTier !== undefined) data.packageTier = packageTier
    if (description !== undefined) data.description = description
    if (beforeImages !== undefined) data.beforeImages = beforeImages
    if (afterImages !== undefined) data.afterImages = afterImages
    if (stageImages !== undefined) data.stageImages = stageImages

    try {
      const row = await prisma.constructionProject.update({ where: { id }, data,
        include: { agent: { select: { id: true, name: true, email: true } } } })
      return serializeProject(row)
    } catch { return reply.code(404).send({ error: 'Project not found' }) }
  })

  // DELETE /projects/:id — admin hard deletes
  app.delete('/projects/:id', { preHandler: requireAdmin,
    schema: { tags: ['Projects'], summary: 'Delete a project record (admin)', security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await prisma.constructionProject.delete({ where: { id } })
      return { deleted: true }
    } catch { return reply.code(404).send({ error: 'Project not found' }) }
  })
}
