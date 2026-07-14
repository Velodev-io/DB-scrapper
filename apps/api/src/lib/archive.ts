// Insert-only archive: every newly created record is also written to a
// separate Supabase database that the app has no UPDATE/DELETE access to.
// Never called from update/delete routes — only from `create` handlers.
// If ARCHIVE_DATABASE_URL isn't set, or the write fails, this silently
// no-ops so it can never affect the primary request/response.

import { PrismaClient } from '@prisma/client'

const globalForArchive = globalThis as unknown as { archivePrisma?: PrismaClient }

function getArchiveClient(): PrismaClient | null {
  const url = process.env.ARCHIVE_DATABASE_URL
  if (!url) return null
  if (!globalForArchive.archivePrisma) {
    globalForArchive.archivePrisma = new PrismaClient({ datasources: { db: { url } } })
  }
  return globalForArchive.archivePrisma
}

async function safeInsert(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.warn('[archive] insert failed (non-fatal):', (err as Error).message)
  }
}

export function archiveAgent(row: any) {
  const db = getArchiveClient()
  if (!db) return
  void safeInsert(() => db.$executeRaw`
    INSERT INTO archive.agents (id, "clerkUserId", name, email, phone, age, status, "createdAt", "updatedAt")
    VALUES (${row.id}, ${row.clerkUserId}, ${row.name}, ${row.email}, ${row.phone}, ${row.age}, ${row.status}, ${row.createdAt}, ${row.updatedAt})
    ON CONFLICT (id) DO NOTHING`)
}

export function archiveProperty(row: any) {
  const db = getArchiveClient()
  if (!db) return
  void safeInsert(() => db.$executeRaw`
    INSERT INTO archive.properties (id, slug, title, "propertyType", "listingType", bhk, "priceInr", "priceLabel",
      "areaSqft", locality, city, address, "reraNumber", status, furnishing, description, images, "floorPlanUrl",
      "videoUrl", featured, amenities, lat, lng, "reviewStatus", published, "securityDeposit", "availableFrom",
      "preferredTenant", "petFriendly", "maintenanceCharges", "leaseDuration", "lockInPeriod", "camCharges",
      "plotAllowedUse", "agentId", "createdAt", "updatedAt")
    VALUES (${row.id}, ${row.slug}, ${row.title}, ${row.propertyType}, ${row.listingType}, ${row.bhk}, ${row.priceInr},
      ${row.priceLabel}, ${row.areaSqft}, ${row.locality}, ${row.city}, ${row.address}, ${row.reraNumber}, ${row.status},
      ${row.furnishing}, ${row.description}, ${row.images}, ${row.floorPlanUrl}, ${row.videoUrl}, ${row.featured},
      ${row.amenities}, ${row.lat}, ${row.lng}, ${row.reviewStatus}, ${row.published}, ${row.securityDeposit},
      ${row.availableFrom}, ${row.preferredTenant}, ${row.petFriendly}, ${row.maintenanceCharges}, ${row.leaseDuration},
      ${row.lockInPeriod}, ${row.camCharges}, ${row.plotAllowedUse}, ${row.agentId}, ${row.createdAt}, ${row.updatedAt})
    ON CONFLICT (id) DO NOTHING`)
}

export function archiveConstructionProject(row: any) {
  const db = getArchiveClient()
  if (!db) return
  void safeInsert(() => db.$executeRaw`
    INSERT INTO archive.construction_projects (id, slug, title, category, location, "areaSqft", "durationMonths",
      "packageTier", description, "beforeImages", "afterImages", "stageImages", "reviewStatus", published, "agentId",
      "createdAt", "updatedAt")
    VALUES (${row.id}, ${row.slug}, ${row.title}, ${row.category}, ${row.location}, ${row.areaSqft}, ${row.durationMonths},
      ${row.packageTier}, ${row.description}, ${row.beforeImages}, ${row.afterImages}, ${row.stageImages},
      ${row.reviewStatus}, ${row.published}, ${row.agentId}, ${row.createdAt}, ${row.updatedAt})
    ON CONFLICT (id) DO NOTHING`)
}

export function archiveLabour(row: any) {
  const db = getArchiveClient()
  if (!db) return
  void safeInsert(() => db.$executeRaw`
    INSERT INTO archive.labour (id, "fullName", age, gender, "skillLevel", "skillType", phone, "profilePhotoUrl",
      "minimumWage", "houseNo", street, locality, city, pincode, "reviewStatus", "agentId", "createdAt", "updatedAt")
    VALUES (${row.id}, ${row.fullName}, ${row.age}, ${row.gender}, ${row.skillLevel}, ${row.skillType}, ${row.phone},
      ${row.profilePhotoUrl}, ${row.minimumWage}, ${row.houseNo}, ${row.street}, ${row.locality}, ${row.city},
      ${row.pincode}, ${row.reviewStatus}, ${row.agentId}, ${row.createdAt}, ${row.updatedAt})
    ON CONFLICT (id) DO NOTHING`)
}

export function archiveShop(row: any) {
  const db = getArchiveClient()
  if (!db) return
  void safeInsert(() => db.$executeRaw`
    INSERT INTO archive.shops (id, "shopName", "shopType", "keeperName", "keeperPhone", address, lat, lng, images,
      "reviewStatus", "agentId", "createdAt", "updatedAt")
    VALUES (${row.id}, ${row.shopName}, ${row.shopType}, ${row.keeperName}, ${row.keeperPhone}, ${row.address},
      ${row.lat}, ${row.lng}, ${row.images}, ${row.reviewStatus}, ${row.agentId}, ${row.createdAt}, ${row.updatedAt})
    ON CONFLICT (id) DO NOTHING`)
}
