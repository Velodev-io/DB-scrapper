-- Insert-only archive mirror (Supabase). Tables live under the "archive"
-- schema because apps/api/src/lib/archive.ts writes via fully-qualified
-- `INSERT INTO archive.<table>` statements — keep the two in sync.
--
-- No foreign keys between archive tables: the primary-DB writes that feed
-- this mirror are fire-and-forget and unordered (e.g. a property can be
-- archived before its agent), so a FK constraint here would make the
-- archive insert fail exactly when it matters most.
--
-- Idempotent throughout (IF NOT EXISTS / DROP+CREATE for policies) so it's
-- safe to re-run after a partial failure without hand-checking what already
-- landed.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "archive";

-- CreateTable
CREATE TABLE IF NOT EXISTS "archive"."agents" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "archive"."properties" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "bhk" INTEGER,
    "priceInr" INTEGER NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "areaSqft" INTEGER NOT NULL,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "reraNumber" TEXT,
    "status" TEXT NOT NULL,
    "furnishing" TEXT,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "floorPlanUrl" TEXT,
    "videoUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "securityDeposit" INTEGER,
    "availableFrom" TEXT,
    "preferredTenant" TEXT,
    "petFriendly" BOOLEAN,
    "maintenanceCharges" INTEGER,
    "leaseDuration" INTEGER,
    "lockInPeriod" INTEGER,
    "camCharges" INTEGER,
    "plotAllowedUse" TEXT,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "archive"."construction_projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "areaSqft" INTEGER,
    "durationMonths" INTEGER,
    "packageTier" TEXT,
    "description" TEXT,
    "beforeImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afterImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stageImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "archive"."labour" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "skillType" TEXT,
    "phone" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "minimumWage" INTEGER,
    "houseNo" TEXT,
    "street" TEXT,
    "locality" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "archive"."shops" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopType" TEXT NOT NULL,
    "keeperName" TEXT NOT NULL,
    "keeperPhone" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agents_clerkUserId_key" ON "archive"."agents"("clerkUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "agents_email_key" ON "archive"."agents"("email");
CREATE INDEX IF NOT EXISTS "agents_clerkUserId_idx" ON "archive"."agents"("clerkUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "properties_slug_key" ON "archive"."properties"("slug");
CREATE INDEX IF NOT EXISTS "properties_agentId_idx" ON "archive"."properties"("agentId");
CREATE INDEX IF NOT EXISTS "properties_reviewStatus_idx" ON "archive"."properties"("reviewStatus");
CREATE INDEX IF NOT EXISTS "properties_city_listingType_propertyType_idx" ON "archive"."properties"("city", "listingType", "propertyType");
CREATE UNIQUE INDEX IF NOT EXISTS "construction_projects_slug_key" ON "archive"."construction_projects"("slug");
CREATE INDEX IF NOT EXISTS "construction_projects_agentId_idx" ON "archive"."construction_projects"("agentId");
CREATE INDEX IF NOT EXISTS "construction_projects_reviewStatus_idx" ON "archive"."construction_projects"("reviewStatus");
CREATE INDEX IF NOT EXISTS "construction_projects_category_idx" ON "archive"."construction_projects"("category");
CREATE INDEX IF NOT EXISTS "labour_agentId_idx" ON "archive"."labour"("agentId");
CREATE INDEX IF NOT EXISTS "labour_reviewStatus_idx" ON "archive"."labour"("reviewStatus");
CREATE INDEX IF NOT EXISTS "labour_city_skillLevel_idx" ON "archive"."labour"("city", "skillLevel");
CREATE INDEX IF NOT EXISTS "shops_agentId_idx" ON "archive"."shops"("agentId");
CREATE INDEX IF NOT EXISTS "shops_reviewStatus_idx" ON "archive"."shops"("reviewStatus");
CREATE INDEX IF NOT EXISTS "shops_shopType_idx" ON "archive"."shops"("shopType");

-- Make the archive structurally append-only: revoke every write privilege
-- except INSERT, so even a compromised/misconfigured app role can't alter
-- or wipe archived rows. archive.ts only ever issues INSERT ... ON CONFLICT
-- DO NOTHING, so this doesn't restrict any real usage.
REVOKE UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA "archive" FROM PUBLIC;

-- Supabase's SQL Editor auto-enables Row Level Security on any table
-- created through it. RLS is a second, independent access-control layer on
-- top of the GRANT/REVOKE above — with it on and zero policies, ANY role
-- that isn't the table owner (or a superuser) gets silently denied on every
-- statement, including INSERT. Enable it explicitly and pair it with an
-- insert-only policy so this can't turn into another silent-failure archive.
ALTER TABLE "archive"."agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "archive"."properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "archive"."construction_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "archive"."labour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "archive"."shops" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archive_insert_only" ON "archive"."agents";
CREATE POLICY "archive_insert_only" ON "archive"."agents" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "archive_insert_only" ON "archive"."properties";
CREATE POLICY "archive_insert_only" ON "archive"."properties" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "archive_insert_only" ON "archive"."construction_projects";
CREATE POLICY "archive_insert_only" ON "archive"."construction_projects" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "archive_insert_only" ON "archive"."labour";
CREATE POLICY "archive_insert_only" ON "archive"."labour" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "archive_insert_only" ON "archive"."shops";
CREATE POLICY "archive_insert_only" ON "archive"."shops" FOR INSERT WITH CHECK (true);
