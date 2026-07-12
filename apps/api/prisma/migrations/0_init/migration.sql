-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "agents" (
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
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
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
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_projects" (
    "id" TEXT NOT NULL,
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
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "skillType" TEXT,
    "phone" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "agents_clerkUserId_key" ON "agents"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "agents"("email");

-- CreateIndex
CREATE INDEX "agents_clerkUserId_idx" ON "agents"("clerkUserId");

-- CreateIndex
CREATE INDEX "properties_agentId_idx" ON "properties"("agentId");

-- CreateIndex
CREATE INDEX "properties_reviewStatus_idx" ON "properties"("reviewStatus");

-- CreateIndex
CREATE INDEX "properties_city_listingType_propertyType_idx" ON "properties"("city", "listingType", "propertyType");

-- CreateIndex
CREATE INDEX "construction_projects_agentId_idx" ON "construction_projects"("agentId");

-- CreateIndex
CREATE INDEX "construction_projects_reviewStatus_idx" ON "construction_projects"("reviewStatus");

-- CreateIndex
CREATE INDEX "construction_projects_category_idx" ON "construction_projects"("category");

-- CreateIndex
CREATE INDEX "labour_agentId_idx" ON "labour"("agentId");

-- CreateIndex
CREATE INDEX "labour_reviewStatus_idx" ON "labour"("reviewStatus");

-- CreateIndex
CREATE INDEX "labour_city_skillLevel_idx" ON "labour"("city", "skillLevel");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_projects" ADD CONSTRAINT "construction_projects_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour" ADD CONSTRAINT "labour_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

