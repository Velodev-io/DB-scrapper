import type { FastifyInstance } from 'fastify'
import { createClerkClient } from '@clerk/backend'
import { Webhook } from 'svix'
import { prisma } from '../lib/prisma.js'

export default async function webhookRoutes(app: FastifyInstance) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

  // Scoped content parser to keep raw body as string for signature verification
  // Fastify's encapsulation ensures this parser only applies to this route file.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/webhooks/clerk', {
    schema: {
      tags: ['System'],
      summary: 'Clerk webhooks endpoint'
    }
  }, async (request, reply) => {
    const headers = request.headers
    const svixId = headers['svix-id'] as string
    const svixTimestamp = headers['svix-timestamp'] as string
    const svixSignature = headers['svix-signature'] as string

    if (!svixId || !svixTimestamp || !svixSignature) {
      return reply.code(400).send({ error: 'Missing svix headers' })
    }

    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) {
      app.log.error('CLERK_WEBHOOK_SECRET is not configured in environment variables')
      return reply.code(500).send({ error: 'Webhook secret not configured' })
    }

    const rawBody = request.body as string
    const wh = new Webhook(secret)
    let payload: any

    try {
      payload = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch (err: any) {
      app.log.error({ err }, 'Webhook verification failed')
      return reply.code(400).send({ error: 'Webhook verification failed' })
    }

    // Handle 'user.created' event
    if (payload.type === 'user.created') {
      const { id: clerkUserId, email_addresses } = payload.data
      const emails = (email_addresses || []).map((e: any) => e.email_address)

      if (emails.length > 0) {
        // Prevent auto-syncing if the email is associated with a revoked agent in our DB
        const revokedAgent = await prisma.agent.findFirst({
          where: {
            email: { in: emails },
            status: 'revoked'
          }
        })
        if (revokedAgent) {
          app.log.info(`Clerk Webhook: Blocked auto-sync role for revoked agent email(s): ${emails.join(', ')}`)
          return { received: true, blocked: true, reason: 'Agent is revoked in local DB' }
        }

        try {
          app.log.info(`Auto-promoting new signup user ${clerkUserId} to agent role`)
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
              app.log.info(`Revoked pending invitation ${matchingInvite.id} for auto-promoted user`)
            }
          } catch (inviteErr) {
            app.log.warn({ err: inviteErr }, 'Failed to check or revoke matching invitations during auto-promotion')
          }
        } catch (err) {
          app.log.error({ err }, `Error matching invitation for newly created user ${clerkUserId}`)
        }
      }
    }

    return { received: true }
  })
}
