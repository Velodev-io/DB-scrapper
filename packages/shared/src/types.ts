// ── Enums ──────────────────────────────────────────────────────────────

export type PropertyType   = 'Apartment' | 'Villa' | 'Plot' | 'Commercial'
export type ListingType    = 'Sale' | 'Resale' | 'Under Construction' | 'Rent'
export type PropertyStatus = 'Ready' | 'Under Construction'
export type FurnishingType = 'Unfurnished' | 'Semi-Furnished' | 'Furnished'
export type ReviewStatus   = 'pending' | 'reviewed' | 'deleted'
export type SkillLevel     = 'Skilled' | 'Non-Skilled'
export type PackageTier    = 'Basic' | 'Premium' | 'Luxury'
export type Gender         = 'Male' | 'Female' | 'Other'
export type AgentStatus    = 'active' | 'revoked'

// ── Models ─────────────────────────────────────────────────────────────

export interface Agent {
  id:          string
  clerkUserId: string
  name:        string
  email:       string
  phone?:      string
  age?:        number
  status:      AgentStatus
  createdAt:   string
  updatedAt:   string
}

export interface Property {
  id:           string
  title:        string
  propertyType: PropertyType
  listingType:  ListingType
  bhk?:         number
  priceInr:     number
  priceLabel:   string          // pre-formatted "₹1.35 Cr"
  areaSqft:     number
  locality:     string
  city:         string
  address?:     string
  reraNumber?:  string
  status:       PropertyStatus
  furnishing?:  FurnishingType
  description?: string
  images:       string[]        // Cloudinary public IDs
  floorPlanUrl?: string         // single Cloudinary public ID
  lat?:         number
  lng?:         number
  reviewStatus: ReviewStatus
  published?:   boolean
  agentId:      string
  agent?:       Pick<Agent, 'id' | 'name' | 'email'>
  createdAt:    string
  updatedAt:    string

  // Rent-specific fields (all optional)
  securityDeposit?:    number
  availableFrom?:      string   // ISO date string
  preferredTenant?:    string   // 'Family' | 'Bachelor' | 'Company' | 'Any'
  petFriendly?:        boolean
  maintenanceCharges?: number
  leaseDuration?:      number
  lockInPeriod?:       number
  camCharges?:         number
  plotAllowedUse?:     string   // 'Residential' | 'Commercial' | 'Agriculture' | 'Any'
}

export interface ConstructionProject {
  id:             string
  title:          string
  category:       string
  location:       string
  areaSqft?:      number
  durationMonths?: number
  packageTier?:   PackageTier
  description?:   string
  beforeImages:   string[]      // Cloudinary public IDs
  afterImages:    string[]
  stageImages:    string[]
  reviewStatus:   ReviewStatus
  published?:     boolean
  agentId:        string
  agent?:         Pick<Agent, 'id' | 'name' | 'email'>
  createdAt:      string
  updatedAt:      string
}

export interface Labour {
  id:              string
  fullName:        string
  age:             number
  gender:          Gender
  skillLevel:      SkillLevel
  skillType?:      string        // only if Skilled
  phone:           string
  profilePhotoUrl?: string       // Cloudinary public ID
  minimumWage?:    number       // minimum wage per day in INR
  houseNo?:        string
  street?:         string
  locality?:       string
  city?:           string
  pincode?:        string
  reviewStatus:    ReviewStatus
  agentId:         string
  agent?:          Pick<Agent, 'id' | 'name' | 'email'>
  createdAt:       string
  updatedAt:       string
}

export interface Shop {
  id:           string
  shopName:     string
  shopType:     string             // free-text: "Cement", "Bricks", etc.
  keeperName:   string
  keeperPhone:  string
  address?:     string
  lat?:         number
  lng?:         number
  images?:      string[]
  reviewStatus: ReviewStatus
  agentId:      string
  agent?:       Pick<Agent, 'id' | 'name' | 'email'>
  createdAt:    string
  updatedAt:    string
}

// ── API Responses ──────────────────────────────────────────────────────

export interface Paginated<T> {
  data:  T[]
  total: number
  page:  number
  limit: number
}

export interface CloudinarySignature {
  signature: string
  timestamp: number
  apiKey:    string
  cloudName: string
  folder:    string
  maxBytes:  number
}

// ── Clerk (used in admin agent management) ─────────────────────────────

export interface ClerkAgentUser {
  id:          string
  firstName?:  string
  lastName?:   string
  emailAddress: string
  status:      'active' | 'pending'  // pending = invited but not signed up yet
}
