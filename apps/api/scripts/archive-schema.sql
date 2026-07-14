-- Insert-only archive mirror (Supabase). Tables live under the "archive"
-- schema because apps/api/src/lib/archive.ts writes via fully-qualified
-- `INSERT INTO archive.<table>` statements — keep the two in sync.
--
-- No foreign keys between archive tables: the primary-DB writes that feed
-- this mirror are fire-and-forget and unordered (e.g. a property can be
-- archived before its agent), so a FK constraint here would make the
-- archive insert fail exactly when it matters most.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "archive";

-- CreateTable
CREATE TABLE "archive"."agents" (
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
CREATE TABLE "archive"."properties" (
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
CREATE TABLE "archive"."construction_projects" (
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
CREATE TABLE "archive"."labour" (
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
CREATE TABLE "archive"."shops" (
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
CREATE UNIQUE INDEX "agents_clerkUserId_key" ON "archive"."agents"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "archive"."agents"("email");

-- CreateIndex
CREATE INDEX "agents_clerkUserId_idx" ON "archive"."agents"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "archive"."properties"("slug");

-- CreateIndex
CREATE INDEX "properties_agentId_idx" ON "archive"."properties"("agentId");

-- CreateIndex
CREATE INDEX "properties_reviewStatus_idx" ON "archive"."properties"("reviewStatus");

-- CreateIndex
CREATE INDEX "properties_city_listingType_propertyType_idx" ON "archive"."properties"("city", "listingType", "propertyType");

-- CreateIndex
CREATE UNIQUE INDEX "construction_projects_slug_key" ON "archive"."construction_projects"("slug");

-- CreateIndex
CREATE INDEX "construction_projects_agentId_idx" ON "archive"."construction_projects"("agentId");

-- CreateIndex
CREATE INDEX "construction_projects_reviewStatus_idx" ON "archive"."construction_projects"("reviewStatus");

-- CreateIndex
CREATE INDEX "construction_projects_category_idx" ON "archive"."construction_projects"("category");

-- CreateIndex
CREATE INDEX "labour_agentId_idx" ON "archive"."labour"("agentId");

-- CreateIndex
CREATE INDEX "labour_reviewStatus_idx" ON "archive"."labour"("reviewStatus");

-- CreateIndex
CREATE INDEX "labour_city_skillLevel_idx" ON "archive"."labour"("city", "skillLevel");

-- CreateIndex
CREATE INDEX "shops_agentId_idx" ON "archive"."shops"("agentId");

-- CreateIndex
CREATE INDEX "shops_reviewStatus_idx" ON "archive"."shops"("reviewStatus");

-- CreateIndex
CREATE INDEX "shops_shopType_idx" ON "archive"."shops"("shopType");

-- Make the archive structurally append-only: revoke every write privilege
-- except INSERT, so even a compromised/misconfigured app role can't alter
-- or wipe archived rows. archive.ts only ever issues INSERT ... ON CONFLICT
-- DO NOTHING, so this doesn't restrict any real usage.
REVOKE UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA "archive" FROM PUBLIC;
