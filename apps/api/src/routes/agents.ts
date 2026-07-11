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
