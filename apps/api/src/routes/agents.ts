import type { FastifyInstance } from 'fastify'
import { createClerkClient, verifyToken } from '@clerk/backend'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export default async function agentRoutes(app: FastifyInstance) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

  // GET /agents — list all Clerk users with a role assigned
  app.get('/agents', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'List all agent and admin users (admin)', security: [{ bearerAuth: [] }] }
  }, async () => {
    const { data: users } = await clerk.users.getUserList({ limit: 200 })
    const activeAgents = users.filter(u => typeof u.publicMetadata?.role === 'string' && u.publicMetadata.role !== '')
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
        imageUrl:     u.publicMetadata?.profilePhotoUrl || u.imageUrl || '',
        role:         u.publicMetadata?.role || 'agent',
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

  // POST /agents — create a new agent profile (admin only)
  app.post('/agents', { preHandler: requireAdmin,
    schema: { tags: ['Agents'], summary: 'Create a new agent profile (admin)', security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'name', 'role'],
        properties: {
          email:           { type: 'string', format: 'email' },
          name:            { type: 'string' },
          phone:           { type: 'string' },
          age:             { type: 'integer', minimum: 0, maximum: 120 },
          role:            { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { email, name, phone, age, role } = request.body as {
      email: string, name: string, phone?: string, age?: number, role: string
    }

    try {
      // 1. Check if user already exists in Clerk
      const { data: existingUsers } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
      let clerkUserId: string

      if (existingUsers.length > 0) {
        clerkUserId = existingUsers[0].id
        // Update their role in Clerk
        await clerk.users.updateUserMetadata(clerkUserId, { publicMetadata: { role } })
      } else {
        // 2. Create the user in Clerk
        const parts = name.split(' ')
        const firstName = parts[0] || ''
        const lastName = parts.slice(1).join(' ')

        const newUser = await clerk.users.createUser({
          emailAddress: [email],
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          publicMetadata: { role },
        })
        clerkUserId = newUser.id
      }

      // 3. Create or update the local database profile
      const agent = await prisma.agent.upsert({
        where: { clerkUserId },
        update: {
          name,
          phone: phone || null,
          age: age || null,
          email,
          status: 'active',
        },
        create: {
          clerkUserId,
          name,
          phone: phone || null,
          age: age || null,
          email,
          status: 'active',
        }
      })

      return agent
    } catch (err: any) {
      app.log.error({ err }, 'Failed to create agent profile')
      return reply.code(400).send({ error: err.message ?? 'Failed to create agent profile' })
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
          name:            { type: 'string' },
          phone:           { type: 'string' },
          age:             { type: 'integer', minimum: 0, maximum: 120 },
          email:           { type: 'string', format: 'email' },
          profilePhotoUrl: { type: 'string' },
          role:            { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { clerkUserId } = request.params as { clerkUserId: string }
    const { name, phone, age, email, profilePhotoUrl, role } = request.body as {
      name?: string, phone?: string, age?: number, email?: string, profilePhotoUrl?: string, role?: string
    }

    try {
      const agent = await prisma.agent.findUnique({ where: { clerkUserId } })
      if (agent && agent.status === 'revoked') {
        return reply.code(400).send({ error: 'Cannot update a revoked agent' })
      }

      // Fetch user profile from Clerk to get default email if not in database
      const user = await clerk.users.getUser(clerkUserId)
      const currentEmail = user.emailAddresses[0]?.emailAddress ?? ''

      const updated = await prisma.agent.upsert({
        where: { clerkUserId },
        update: {
          name:  name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          age:   age !== undefined ? age : undefined,
          email: email !== undefined ? email : undefined,
        },
        create: {
          clerkUserId,
          email: email ?? currentEmail,
          name:  name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || email || currentEmail),
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

      // Update email in Clerk if it changed
      if (email && email !== currentEmail) {
        try {
          await clerk.emailAddresses.createEmailAddress({
            userId: clerkUserId,
            emailAddress: email,
            verified: true,
            primary: true
          })
        } catch (clerkErr: any) {
          app.log.warn({ err: clerkErr }, 'Failed to update email address in Clerk')
          return reply.code(400).send({ error: clerkErr.message || 'Failed to update email address in Clerk' })
        }
      }

      // Update profilePhotoUrl in Clerk publicMetadata if it changed
      if (profilePhotoUrl !== undefined) {
        try {
          await clerk.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { profilePhotoUrl: profilePhotoUrl || null }
          })
        } catch (clerkErr: any) {
          app.log.warn({ err: clerkErr }, 'Failed to update profile photo URL in Clerk metadata')
        }
      }

      // Update role in Clerk publicMetadata if it changed
      if (role !== undefined) {
        try {
          await clerk.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { role }
          })
        } catch (clerkErr: any) {
          app.log.warn({ err: clerkErr }, 'Failed to update role in Clerk metadata')
        }
      }

      return updated
    } catch (err: any) {
      app.log.error({ err }, 'Error updating agent details')
      return reply.code(400).send({ error: err.message ?? 'Failed to update agent profile' })
    }
  })
}
