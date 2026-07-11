import type { FastifyInstance } from 'fastify'
import { createClerkClient, verifyToken } from '@clerk/backend'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export default async function agentRoutes(app: FastifyInstance) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

  // GET /agents — list all Clerk users with role: agent
  app.get('/agents', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'List all agent users (admin)', security: [{ bearerAuth: [] }] }
  }, async () => {
    const { data: users } = await clerk.users.getUserList({ limit: 200 })
    const activeAgents = users.filter(u => u.publicMetadata?.role === 'agent')
    const clerkUserIds = activeAgents.map(u => u.id)

    // Query database for custom agent profiles
    const dbAgents = await prisma.agent.findMany({
      where: { clerkUserId: { in: clerkUserIds } }
    })

    const dbAgentMap = new Map<string, any>(dbAgents.map((a: any) => [a.clerkUserId, a]))

    return activeAgents.map(u => {
      const dbAgent = dbAgentMap.get(u.id) as any
      return {
        id:           u.id,
        name:         dbAgent?.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'Unknown',
        email:        dbAgent?.email || u.emailAddresses[0]?.emailAddress || '',
        phone:        dbAgent?.phone || u.phoneNumbers[0]?.phoneNumber || '',
        age:          dbAgent?.age ?? null,
        status:       dbAgent?.status || 'active',
        createdAt:    new Date(u.createdAt).toISOString(),
      }
    })
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
      // First try to send an invitation (for users not yet in Clerk)
      await clerk.invitations.createInvitation({
        emailAddress:   email,
        publicMetadata: { role: 'agent' },
        redirectUrl:    process.env.AGENT_APP_URL ?? 'https://carry-agent.web.app',
      })
      return { invited: true, alreadyRegistered: false, email }
    } catch (inviteErr: any) {
      app.log.error({ err: inviteErr }, 'Clerk invitation failed')

      const status = inviteErr?.status ?? inviteErr?.errors?.[0]?.meta?.httpCode
      const isDuplicate = inviteErr?.errors?.some((e: any) => e.code === 'duplicate_record') ||
                          inviteErr?.message?.includes('already') ||
                          inviteErr?.message?.includes('duplicate')

      if (status === 422 || isDuplicate) {
        try {
          const { data: users } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
          if (!users.length) {
            return reply.code(400).send({
              error: 'Clerk blocks re-inviting this email due to accepted history. Please ask them to sign up directly first, then grant access.'
            })
          }
          if (users[0].publicMetadata?.role === 'admin') {
            return reply.code(400).send({ error: 'User is already an Admin' })
          }
          await clerk.users.updateUserMetadata(users[0].id, { publicMetadata: { role: 'agent' } })
          return { invited: true, alreadyRegistered: true, email }
        } catch (updateErr: any) {
          return reply.code(400).send({ error: updateErr.message ?? 'Failed to grant access' })
        }
      }
      return reply.code(400).send({ error: inviteErr.message ?? 'Failed to send invitation' })
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

  // POST /agents/sync-role — sync/assign role for a newly signed up user if they were previously invited
  app.post('/agents/sync-role', {
    schema: {
      tags: ['Agents'],
      summary: 'Sync agent role after signup if invited',
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const header = request.headers.authorization ?? ''
    const token  = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) {
      return reply.code(401).send({ error: 'Unauthorized — Bearer token required' })
    }

    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! })
      const clerkUserId = payload.sub

      // Prevent role sync if this agent was revoked in our database
      const existingAgent = await prisma.agent.findUnique({
        where: { clerkUserId }
      })
      if (existingAgent && existingAgent.status === 'revoked') {
        return reply.code(403).send({ error: 'Forbidden — Agent access is revoked' })
      }

      // Fetch user profile from Clerk
      const user = await clerk.users.getUser(clerkUserId)

      // If user already has a role, no need to sync
      if (user.publicMetadata?.role) {
        return { synced: true, role: user.publicMetadata.role }
      }

      const emails = user.emailAddresses.map(e => e.emailAddress)
      if (emails.length === 0) {
        return reply.code(400).send({ error: 'User has no email addresses' })
      }

      // Auto-promote the authenticated user to 'agent' role
      app.log.info(`Auto-promoting user ${clerkUserId} via sync-role fallback`)
      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { role: 'agent' }
      })

      // Clean up any pending invitations for their email addresses if they exist
      try {
        const { data: invitations } = await clerk.invitations.getInvitationList({ limit: 500 })
        const matchingInvite = invitations.find(
          (inv: any) => emails.includes(inv.emailAddress)
        )
        if (matchingInvite && matchingInvite.status === 'pending') {
          await clerk.invitations.revokeInvitation(matchingInvite.id)
          app.log.info(`Revoked pending invitation ${matchingInvite.id} during sync-role fallback`)
        }
      } catch (inviteErr) {
        app.log.warn({ err: inviteErr }, 'Failed to check or revoke matching invitations during sync-role auto-promotion')
      }

      return { synced: true, role: 'agent' }
    } catch (err: any) {
      app.log.error({ err }, 'Error syncing agent role')
      return reply.code(401).send({ error: err.message ?? 'Invalid token or authentication failed' })
    }
  })

  // PATCH /agents/:clerkUserId — update agent profile (admin only)
  app.patch('/agents/:clerkUserId', { preHandler: requireAdmin,
    schema: {
      tags: ['Agents'],
      summary: 'Update agent profile (admin)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['clerkUserId'],
        properties: { clerkUserId: { type: 'string' } }
      },
      body: {
        type: 'object',
        properties: {
          name:  { type: 'string' },
          phone: { type: 'string' },
          age:   { type: 'integer', minimum: 0, maximum: 120 }
        }
      }
    }
  }, async (request, reply) => {
    const { clerkUserId } = request.params as { clerkUserId: string }
    const { name, phone, age } = request.body as { name?: string, phone?: string, age?: number }

    try {
      const agent = await prisma.agent.findUnique({ where: { clerkUserId } })
      if (agent && agent.status === 'revoked') {
        return reply.code(400).send({ error: 'Cannot update a revoked agent' })
      }

      // Fetch user profile from Clerk to get default email if not in database
      const user = await clerk.users.getUser(clerkUserId)
      const email = user.emailAddresses[0]?.emailAddress ?? ''

      const updated = await prisma.agent.upsert({
        where: { clerkUserId },
        update: {
          name:  name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          age:   age !== undefined ? age : undefined,
        },
        create: {
          clerkUserId,
          email,
          name:  name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || email),
          phone: phone ?? user.phoneNumbers[0]?.phoneNumber ?? null,
          age:   age ?? null,
          status: 'active'
        }
      })

      // Also update name in Clerk user profile so they sync
      if (name) {
        const parts = name.split(' ')
        const firstName = parts[0] || ''
        const lastName = parts.slice(1).join(' ')
        try {
          await clerk.users.updateUser(clerkUserId, { firstName, lastName })
        } catch (clerkErr) {
          app.log.warn({ err: clerkErr }, 'Failed to update user name in Clerk profile')
        }
      }

      return updated
    } catch (err: any) {
      app.log.error({ err }, 'Error updating agent details')
      return reply.code(400).send({ error: err.message ?? 'Failed to update agent profile' })
    }
  })
}
