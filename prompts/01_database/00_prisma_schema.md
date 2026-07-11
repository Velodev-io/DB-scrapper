# Phase 1 — File 00: Prisma Schema (Neon PostgreSQL)

> **Antigravity Instructions:** Create the complete Prisma schema. Do not run `prisma db push` yet — that happens in File 01 after the Neon connection string is ready. Create the schema file now.

---

## Context

- Database: Neon PostgreSQL (free tier)
- ORM: Prisma v6
- The `DATABASE_URL` in `.env` currently points to SQLite (`file:./prisma/dev.db`) — this will be replaced with the Neon connection string in File 01
- For now, set provider to `postgresql` so the schema is correct from the start

---

## File: apps/api/prisma/schema.prisma

```prisma
// Carry Construction — Field Ops Data Models
// Provider: PostgreSQL (Neon free tier in prod, same for dev via Neon branch)
// To run migrations: npm run db:migrate (from repo root)
// To explore data:   npm run db:studio  (from repo root)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Agent ──────────────────────────────────────────────────────────────
// Created automatically on first sign-in via Clerk webhook,
// or manually via the admin "invite agent" flow.

model Agent {
  id          String   @id @default(cuid())
  clerkUserId String   @unique
  name        String
  email       String   @unique
  status      String   @default("active")  // "active" | "revoked"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  properties Property[]
  projects   ConstructionProject[]
  labour     Labour[]

  @@index([clerkUserId])
  @@map("agents")
}

// ── Property ───────────────────────────────────────────────────────────

model Property {
  id           String   @id @default(cuid())
  title        String
  propertyType String                         // "Apartment" | "Villa" | "Plot" | "Commercial"
  listingType  String                         // "Sale" | "Resale" | "Under Construction"
  bhk          Int?
  priceInr     Int
  priceLabel   String                         // pre-formatted "₹1.35 Cr"
  areaSqft     Int
  locality     String
  city         String
  address      String?
  reraNumber   String?
  status       String                         // "Ready" | "Under Construction"
  furnishing   String?                        // "Unfurnished" | "Semi-Furnished" | "Furnished"
  description  String?
  images       String[]  @default([])         // Cloudinary public IDs (Postgres native array)
  floorPlanUrl String?                        // single Cloudinary public ID
  lat          Float?
  lng          Float?
  reviewStatus String    @default("pending")  // "pending" | "reviewed" | "deleted"

  agentId      String
  agent        Agent    @relation(fields: [agentId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([agentId])
  @@index([reviewStatus])
  @@index([city, listingType, propertyType])
  @@map("properties")
}

// ── ConstructionProject ────────────────────────────────────────────────

model ConstructionProject {
  id             String   @id @default(cuid())
  title          String
  category       String                         // "Turnkey Villa" | "Renovation" | "Interior" | "Commercial Build"
  location       String
  areaSqft       Int?
  durationMonths Int?
  packageTier    String?                        // "Basic" | "Premium" | "Luxury"
  description    String?
  beforeImages   String[] @default([])          // Cloudinary public IDs
  afterImages    String[] @default([])
  stageImages    String[] @default([])
  reviewStatus   String   @default("pending")

  agentId        String
  agent          Agent    @relation(fields: [agentId], references: [id])

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([agentId])
  @@index([reviewStatus])
  @@index([category])
  @@map("construction_projects")
}

// ── Labour ─────────────────────────────────────────────────────────────

model Labour {
  id              String   @id @default(cuid())
  fullName        String
  age             Int
  gender          String                        // "Male" | "Female" | "Other"
  skillLevel      String                        // "Skilled" | "Non-Skilled"
  skillType       String?                       // only if Skilled — from SKILL_TYPES list
  phone           String
  profilePhotoUrl String?                       // single Cloudinary public ID

  // Availability address
  houseNo         String?
  street          String?
  locality        String?
  city            String?
  pincode         String?

  reviewStatus    String   @default("pending")

  agentId         String
  agent           Agent    @relation(fields: [agentId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([agentId])
  @@index([reviewStatus])
  @@index([city, skillLevel])
  @@map("labour")
}
```

---

## File: apps/api/src/lib/prisma.ts

```typescript
// Prisma client singleton — prevents too many connections in development
// (Next.js / hot-reload safe pattern, works for Fastify too)

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

## File: apps/api/src/lib/serialize.ts

Helper to convert Prisma rows to the shared types (parse JSON arrays for SQLite compat if ever needed, or pass Postgres arrays directly):

```typescript
import type { Property, ConstructionProject, Labour, Agent } from '@carry/shared'

// For PostgreSQL, Prisma returns native arrays — these functions ensure
// the API always returns the correct shape matching the shared types.

export function serializeAgent(row: any): Agent {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    name: row.name,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function serializeProperty(row: any): Property {
  return {
    id: row.id,
    title: row.title,
    propertyType: row.propertyType,
    listingType: row.listingType,
    bhk: row.bhk ?? undefined,
    priceInr: row.priceInr,
    priceLabel: row.priceLabel,
    areaSqft: row.areaSqft,
    locality: row.locality,
    city: row.city,
    address: row.address ?? undefined,
    reraNumber: row.reraNumber ?? undefined,
    status: row.status,
    furnishing: row.furnishing ?? undefined,
    description: row.description ?? undefined,
    images: Array.isArray(row.images) ? row.images : [],
    floorPlanUrl: row.floorPlanUrl ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    reviewStatus: row.reviewStatus,
    agentId: row.agentId,
    agent: row.agent ? {
      id: row.agent.id,
      name: row.agent.name,
      email: row.agent.email,
    } : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function serializeProject(row: any): ConstructionProject {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    location: row.location,
    areaSqft: row.areaSqft ?? undefined,
    durationMonths: row.durationMonths ?? undefined,
    packageTier: row.packageTier ?? undefined,
    description: row.description ?? undefined,
    beforeImages: Array.isArray(row.beforeImages) ? row.beforeImages : [],
    afterImages:  Array.isArray(row.afterImages)  ? row.afterImages  : [],
    stageImages:  Array.isArray(row.stageImages)  ? row.stageImages  : [],
    reviewStatus: row.reviewStatus,
    agentId: row.agentId,
    agent: row.agent ? { id: row.agent.id, name: row.agent.name, email: row.agent.email } : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function serializeLabour(row: any): Labour {
  return {
    id: row.id,
    fullName: row.fullName,
    age: row.age,
    gender: row.gender,
    skillLevel: row.skillLevel,
    skillType: row.skillType ?? undefined,
    phone: row.phone,
    profilePhotoUrl: row.profilePhotoUrl ?? undefined,
    houseNo: row.houseNo ?? undefined,
    street: row.street ?? undefined,
    locality: row.locality ?? undefined,
    city: row.city ?? undefined,
    pincode: row.pincode ?? undefined,
    reviewStatus: row.reviewStatus,
    agentId: row.agentId,
    agent: row.agent ? { id: row.agent.id, name: row.agent.name, email: row.agent.email } : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
```

---

## Notes on PostgreSQL vs SQLite

The previous website's schema used SQLite with `String @default("[]")` for array fields because SQLite has no native arrays. This new schema uses **Postgres native arrays** (`String[] @default([])`). Benefits:
- No `JSON.stringify` / `JSON.parse` needed
- Can query inside arrays natively
- Prisma returns them as proper JavaScript arrays

---

## Verification

After creating the files, run:

```bash
npx prisma format --schema apps/api/prisma/schema.prisma
```

This verifies the schema syntax is valid. It should report "Formatted" with no errors.

Do NOT run `prisma db push` yet — wait for `01_neon_setup.md`.

**✓ Phase 1, File 00 complete. Proceed to `01_database/01_neon_setup.md`.**
