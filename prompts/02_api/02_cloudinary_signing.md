# Phase 2 — File 02: Cloudinary Upload Signing

> **Antigravity Instructions:** Build the uploads route. This handles two things: signing Cloudinary uploads for agents, and patching DB records when offline-queued uploads finally complete.

---

## File: apps/api/src/routes/uploads.ts

```typescript
import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { requireAgent } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

const ALLOWED_FOLDERS = ['properties', 'projects', 'labour'] as const
type UploadFolder = typeof ALLOWED_FOLDERS[number]

export default async function uploadsRoutes(app: FastifyInstance) {

  // ── GET /uploads/sign — agent requests a Cloudinary signed upload ────────
  app.get(
    '/uploads/sign',
    {
      preHandler: requireAgent,
      schema: {
        tags: ['Uploads'],
        summary: 'Get a Cloudinary signed upload signature (agent)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            folder: {
              type: 'string',
              enum: ['properties', 'projects', 'labour'],
              description: 'Cloudinary folder to upload into',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              signature: { type: 'string' },
              timestamp:  { type: 'number' },
              apiKey:     { type: 'string' },
              cloudName:  { type: 'string' },
              folder:     { type: 'string' },
              maxBytes:   { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const cloudName  = process.env.CLOUDINARY_CLOUD_NAME
      const apiKey     = process.env.CLOUDINARY_API_KEY
      const apiSecret  = process.env.CLOUDINARY_API_SECRET

      if (!cloudName || !apiKey || !apiSecret) {
        return reply.code(500).send({ error: 'Cloudinary environment variables not configured' })
      }

      const folder = ((request.query as any).folder ?? 'properties') as UploadFolder

      if (!ALLOWED_FOLDERS.includes(folder)) {
        return reply.code(400).send({ error: `Invalid folder. Must be one of: ${ALLOWED_FOLDERS.join(', ')}` })
      }

      const timestamp = Math.round(Date.now() / 1000)
      const maxBytes  = 15 * 1024 * 1024  // 15 MB safety net (client already compressed to ~1 MB)

      // Cloudinary signature: SHA1 of sorted params + secret
      const paramStr  = `folder=${folder}&max_bytes=${maxBytes}&timestamp=${timestamp}`
      const signature = crypto
        .createHash('sha1')
        .update(paramStr + apiSecret)
        .digest('hex')

      return { signature, timestamp, apiKey, cloudName, folder, maxBytes }
    }
  )

  // ── PATCH /uploads/patch-queued — called by Service Worker after offline upload ──
  // When an agent was offline, their photo was stored in IndexedDB.
  // When they come back online, the Service Worker uploads the photo to Cloudinary
  // and then calls this endpoint to update the DB record with the new Cloudinary public ID.
  app.patch(
    '/uploads/patch-queued',
    {
      preHandler: requireAgent,
      schema: {
        tags: ['Uploads'],
        summary: 'Patch a queued upload into the DB record after offline upload completes',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['model', 'recordId', 'fieldName', 'publicId'],
          properties: {
            model:     { type: 'string', enum: ['property', 'project', 'labour'] },
            recordId:  { type: 'string' },
            fieldName: { type: 'string' },   // 'images' | 'beforeImages' | 'afterImages' | 'stageImages' | 'profilePhotoUrl'
            publicId:  { type: 'string' },   // Cloudinary public ID (not the full URL)
          },
        },
      },
    },
    async (request, reply) => {
      const { model, recordId, fieldName, publicId } = request.body as {
        model: 'property' | 'project' | 'labour'
        recordId: string
        fieldName: string
        publicId: string
      }

      const clerkUserId = (request as any).clerkUserId

      try {
        if (model === 'property') {
          // Verify this property belongs to the requesting agent
          const prop = await prisma.property.findFirst({
            where: { id: recordId, agent: { clerkUserId } },
            select: { id: true, images: true, floorPlanUrl: true },
          })
          if (!prop) return reply.code(404).send({ error: 'Property not found or not yours' })

          const isArray = ['images'].includes(fieldName)
          if (isArray) {
            await prisma.property.update({
              where: { id: recordId },
              data: { images: { push: publicId } },
            })
          } else {
            await prisma.property.update({
              where: { id: recordId },
              data: { [fieldName]: publicId },
            })
          }

        } else if (model === 'project') {
          const proj = await prisma.constructionProject.findFirst({
            where: { id: recordId, agent: { clerkUserId } },
            select: { id: true },
          })
          if (!proj) return reply.code(404).send({ error: 'Project not found or not yours' })

          const arrayFields = ['beforeImages', 'afterImages', 'stageImages']
          if (arrayFields.includes(fieldName)) {
            await prisma.constructionProject.update({
              where: { id: recordId },
              data: { [fieldName]: { push: publicId } },
            })
          }

        } else if (model === 'labour') {
          const lab = await prisma.labour.findFirst({
            where: { id: recordId, agent: { clerkUserId } },
            select: { id: true },
          })
          if (!lab) return reply.code(404).send({ error: 'Labour record not found or not yours' })

          await prisma.labour.update({
            where: { id: recordId },
            data: { profilePhotoUrl: publicId },
          })
        }

        return { ok: true }

      } catch (err) {
        return reply.code(500).send({ error: 'Failed to patch queued upload' })
      }
    }
  )
}
```

---

## Verification

Start the API and test signing:

```bash
# Get a signature (no auth in test — add auth header in real test)
curl "http://localhost:4001/api/v1/uploads/sign?folder=properties" \
  -H "Authorization: Bearer <agent_token>"
```

Expected response:
```json
{
  "signature": "abc123...",
  "timestamp": 1700000000,
  "apiKey": "your_api_key",
  "cloudName": "carry-construction",
  "folder": "properties",
  "maxBytes": 15728640
}
```

**✓ Phase 2, File 02 complete. Proceed to `02_api/03_properties_routes.md`.**
