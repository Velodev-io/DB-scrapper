import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@clerk/backend'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY ?? ''

// ── Extract role from JWT (local operation — no HTTP call to Clerk) ───────
// Role is embedded in the JWT via Clerk session customization:
//   Dashboard → Sessions → Customize session token → { "role": "{{user.public_metadata.role}}" }

async function extractRoleFromJWT(request: FastifyRequest): Promise<{ role: string | null; sub: string | null }> {
  const header = request.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token || !CLERK_SECRET) return { role: null, sub: null }

  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET })

    // 'role' is the custom claim we added to the session token template
    let role = (payload as Record<string, unknown>).role as string | null

    // Fallback: If role is missing from JWT, fetch user directly from Clerk
    if (!role && payload.sub) {
      const { createClerkClient } = await import('@clerk/backend')
      const clerk = createClerkClient({ secretKey: CLERK_SECRET })
      const user = await clerk.users.getUser(payload.sub)
      role = (user.publicMetadata?.role as string) ?? null
    }

    return { role, sub: payload.sub }
  } catch (err) {
    console.error('JWT Verification Error:', err)
    return { role: null, sub: null }
  }
}

// ── Middleware: Agent routes ───────────────────────────────────────────────
// Allows role: "agent" or role: "admin" (admins can test agent endpoints)

export async function requireAgent(request: FastifyRequest, reply: FastifyReply) {
  const { role, sub } = await extractRoleFromJWT(request)

  if (!role) {
    return reply.code(401).send({
      error: 'Unauthorized — valid Clerk session token required',
      docs:  'Pass Authorization: Bearer <token> from useAuth().getToken()',
    })
  }

  if (role !== 'agent' && role !== 'admin') {
    return reply.code(403).send({
      error: 'Forbidden — agent role required',
    })
  }

  ;(request as any).clerkUserId = sub
}

// ── Middleware: Admin routes ───────────────────────────────────────────────
// Allows role: "admin" only

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const { role, sub } = await extractRoleFromJWT(request)

  if (!role) {
    return reply.code(401).send({
      error: 'Unauthorized — valid Clerk session token required',
    })
  }

  if (role !== 'admin') {
    return reply.code(403).send({
      error: 'Forbidden — admin role required',
    })
  }

  ;(request as any).clerkUserId = sub
}

// ── Helper: Get agent's DB record from Clerk userId ───────────────────────
// Call this inside route handlers to get/create the Agent row in the DB

import { prisma } from './prisma.js'

export async function getOrCreateAgent(clerkUserId: string): Promise<string> {
  // Try to find existing agent
  const existing = await prisma.agent.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })

  if (existing) return existing.id

  // Auto-create agent row on first API call (lazy sync from Clerk)
  // This handles the case where the Clerk webhook hasn't fired yet
  const { createClerkClient } = await import('@clerk/backend')
  const clerk = createClerkClient({ secretKey: CLERK_SECRET })
  const user = await clerk.users.getUser(clerkUserId)

  const agent = await prisma.agent.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      name:  (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.emailAddresses[0]?.emailAddress) ?? 'Unknown',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      phone: user.phoneNumbers[0]?.phoneNumber ?? null,
      status: 'active',
    },
    update: {}, // already exists — no changes needed
  })

  return agent.id
}
