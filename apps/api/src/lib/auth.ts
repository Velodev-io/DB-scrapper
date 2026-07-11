import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@clerk/backend'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY ?? ''

// ── Extract role from JWT (local operation — no HTTP call to Clerk) ───────
// Role is embedded in the JWT via Clerk session customization:
//   Dashboard → Sessions → Customize session token → { "role": "{{user.public_metadata.role}}" }

async function extractRoleFromJWT(request: FastifyRequest): Promise<string | null> {
  const header = request.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token || !CLERK_SECRET) return null

  try {
    // verifyToken() verifies the JWT signature locally using Clerk's public key.
    // It does NOT make an HTTP call to Clerk's API.
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

    return role
  } catch (err) {
    console.error('JWT Verification Error:', err)
    // Token expired, invalid signature, or malformed — treat as unauthenticated
    return null
  }
}

// ── Middleware: Agent routes ───────────────────────────────────────────────
// Allows role: "agent" or role: "admin" (admins can test agent endpoints)

export async function requireAgent(request: FastifyRequest, reply: FastifyReply) {
  const role = await extractRoleFromJWT(request)

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

  // Attach the agent's Clerk sub (userId) to the request for use in route handlers
  const header = request.headers.authorization!.slice(7)
  const payload = await verifyToken(header, { secretKey: CLERK_SECRET })
  ;(request as any).clerkUserId = payload.sub
}

// ── Middleware: Admin routes ───────────────────────────────────────────────
// Allows role: "admin" only

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const role = await extractRoleFromJWT(request)

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

  const header = request.headers.authorization!.slice(7)
  const payload = await verifyToken(header, { secretKey: CLERK_SECRET })
  ;(request as any).clerkUserId = payload.sub
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

  const agent = await prisma.agent.create({
    data: {
      clerkUserId,
      name:  (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.emailAddresses[0]?.emailAddress) ?? 'Unknown',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      phone: user.phoneNumbers[0]?.phoneNumber ?? null,
      status: 'active',
    },
  })

  return agent.id
}
