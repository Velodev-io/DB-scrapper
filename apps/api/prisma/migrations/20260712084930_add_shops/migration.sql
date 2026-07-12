-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopType" TEXT NOT NULL,
    "keeperName" TEXT NOT NULL,
    "keeperPhone" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shops_agentId_idx" ON "shops"("agentId");

-- CreateIndex
CREATE INDEX "shops_reviewStatus_idx" ON "shops"("reviewStatus");

-- CreateIndex
CREATE INDEX "shops_shopType_idx" ON "shops"("shopType");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
