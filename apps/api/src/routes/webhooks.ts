import type { FastifyInstance } from 'fastify'
import { createClerkClient } from '@clerk/backend'
import { Webhook } from 'svix'

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
        try {
          const { data: invitations } = await clerk.invitations.getInvitationList({ status: 'pending' })
          const matchingInvite = invitations.find(
            (inv: any) => emails.includes(inv.emailAddress) && inv.publicMetadata?.role === 'agent'
          )

          if (matchingInvite) {
            app.log.info(`Syncing agent role for user ${clerkUserId} matching invite ${matchingInvite.id}`)
            await clerk.users.updateUserMetadata(clerkUserId, {
              publicMetadata: { role: 'agent' }
            })

            try {
              await clerk.invitations.revokeInvitation(matchingInvite.id)
            } catch (revokeErr) {
              app.log.warn({ err: revokeErr }, `Failed to revoke invitation ${matchingInvite.id}`)
            }
          }
        } catch (err) {
          app.log.error({ err }, `Error matching invitation for newly created user ${clerkUserId}`)
        }
      }
    }

    return { received: true }
  })
}
