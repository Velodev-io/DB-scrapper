import type { Property, ConstructionProject, Labour, Agent, Shop } from '@carry/shared'

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

export function serializeShop(row: any): Shop {
  return {
    id:          row.id,
    shopName:    row.shopName,
    shopType:    row.shopType,
    keeperName:  row.keeperName,
    keeperPhone: row.keeperPhone,
    address:     row.address ?? undefined,
    lat:         row.lat ?? undefined,
    lng:         row.lng ?? undefined,
    reviewStatus: row.reviewStatus,
    agentId:     row.agentId,
    agent: row.agent ? { id: row.agent.id, name: row.agent.name, email: row.agent.email } : undefined,
    createdAt:   row.createdAt.toISOString(),
    updatedAt:   row.updatedAt.toISOString(),
  }
}
