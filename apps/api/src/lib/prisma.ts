// Prisma client singleton — prevents too many connections in development
// (Next.js / hot-reload safe pattern, works for Fastify too)
//
// Extended with an insert-only archive hook: every create/upsert on the
// archived models also writes a copy to the append-only Supabase mirror
// (see lib/archive.ts). This is centralized here — via a query extension,
// not a per-route call — so a future create route can't forget to wire it.

import { PrismaClient } from '@prisma/client'
import {
  archiveAgent, archiveProperty, archiveConstructionProject, archiveLabour, archiveShop,
} from './archive.js'

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  }).$extends({
    query: {
      agent: {
        async create({ args, query }) { const row = await query(args); archiveAgent(row); return row },
        async upsert({ args, query }) { const row = await query(args); archiveAgent(row); return row },
      },
      property: {
        async create({ args, query }) { const row = await query(args); archiveProperty(row); return row },
      },
      constructionProject: {
        async create({ args, query }) { const row = await query(args); archiveConstructionProject(row); return row },
      },
      labour: {
        async create({ args, query }) { const row = await query(args); archiveLabour(row); return row },
      },
      shop: {
        async create({ args, query }) { const row = await query(args); archiveShop(row); return row },
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> }

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
