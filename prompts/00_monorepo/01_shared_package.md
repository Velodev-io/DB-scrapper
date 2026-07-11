# Phase 0 — File 01: Shared Package

> **Antigravity Instructions:** Build the complete shared package. This is depended on by both apps and must be finished before any app code is written.

---

## What You Are Building

`packages/shared/` — the internal library shared by `apps/agent`, `apps/admin`, and `apps/api`.

Exports:
- All TypeScript types and interfaces
- All UI constants (SKILL_TYPES, etc.)
- Typed fetch API client with 15s timeout
- Cloudinary URL helper functions
- Clerk appearance config matching brand

---

## File: packages/shared/src/types.ts

```typescript
// ── Enums ──────────────────────────────────────────────────────────────

export type PropertyType   = 'Apartment' | 'Villa' | 'Plot' | 'Commercial'
export type ListingType    = 'Sale' | 'Resale' | 'Under Construction'
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
  agentId:      string
  agent?:       Pick<Agent, 'id' | 'name' | 'email'>
  createdAt:    string
  updatedAt:    string
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
```

---

## File: packages/shared/src/constants.ts

```typescript
export const SKILL_TYPES = [
  'Mason / Bricklayer',
  'Painter',
  'Electrician',
  'Plumber',
  'Carpenter / Woodworker',
  'Welder / Fabricator',
  'Tile Setter / Flooring',
  'Roofer',
  'Civil Helper / General Labour',
] as const

export type SkillType = typeof SKILL_TYPES[number]

export const PROJECT_CATEGORIES = [
  'Turnkey Villa',
  'Renovation',
  'Interior',
  'Commercial Build',
] as const

export const PROPERTY_TYPES    = ['Apartment', 'Villa', 'Plot', 'Commercial']    as const
export const LISTING_TYPES     = ['Sale', 'Resale', 'Under Construction']         as const
export const PROPERTY_STATUSES = ['Ready', 'Under Construction']                  as const
export const FURNISHING_TYPES  = ['Unfurnished', 'Semi-Furnished', 'Furnished']  as const
export const PACKAGE_TIERS     = ['Basic', 'Premium', 'Luxury']                  as const
export const GENDERS           = ['Male', 'Female', 'Other']                     as const
export const REVIEW_STATUSES   = ['pending', 'reviewed', 'deleted']              as const

// BHK options for the chip selector
export const BHK_OPTIONS = [1, 2, 3, 4, 5] as const

// Price label formatter — converts raw INR to display label
export function formatPriceLabel(priceInr: number): string {
  if (priceInr >= 10_000_000) {
    return `₹${(priceInr / 10_000_000).toFixed(2)} Cr`
  }
  if (priceInr >= 100_000) {
    return `₹${(priceInr / 100_000).toFixed(2)} L`
  }
  return `₹${priceInr.toLocaleString('en-IN')}`
}
```

---

## File: packages/shared/src/api.ts

```typescript
const DEFAULT_TIMEOUT_MS = 15_000  // 15 seconds — critical for field agents on slow networks

class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; timeout?: number } = {}
): Promise<T> {
  const { token, timeout = DEFAULT_TIMEOUT_MS, ...init } = options

  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeout)

  const base = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:4001/api/v1'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> ?? {}),
  }

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    })

    clearTimeout(timerId)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiError(body.error ?? 'Request failed', res.status)
    }

    return res.json() as Promise<T>
  } catch (err) {
    clearTimeout(timerId)
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Request timed out — check your connection', 408)
    }
    throw err
  }
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),

  post: <T>(path: string, body: unknown, token: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),

  patch: <T>(path: string, body: unknown, token: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: <T>(path: string, token: string) =>
    request<T>(path, { method: 'DELETE', token }),
}

export { ApiError }
```

---

## File: packages/shared/src/cloudinary.ts

```typescript
// All images are stored as Cloudinary public IDs in the DB.
// URLs are constructed here at read time using transformation parameters.
// This means changing quality/size settings requires no DB migration.

const getCloud = () =>
  (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ?? 'carry-construction'

const base = () => `https://res.cloudinary.com/${getCloud()}/image/upload`

export const img = {
  // Tiny thumbnail for list views and table rows (fast on 3G)
  thumb: (publicId: string) =>
    `${base()}/w_200,h_200,c_fill,q_70,f_auto/${publicId}`,

  // Card image for property/project cards
  card: (publicId: string) =>
    `${base()}/w_800,q_auto,f_auto/${publicId}`,

  // Full-screen image for admin detail view
  full: (publicId: string) =>
    `${base()}/q_100/${publicId}`,

  // Forces browser to download at original quality (admin "Download" button)
  download: (publicId: string, filename: string) =>
    `${base()}/fl_attachment:${encodeURIComponent(filename)},q_100/${publicId}`,
}
```

---

## File: packages/shared/src/clerkAppearance.ts

```typescript
import type { Appearance } from '@clerk/clerk-react'

// Matches Carry Construction brand colours and fonts.
// Used in ClerkProvider appearance prop in both apps.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary:    '#B87333',   // Ochre
    colorBackground: '#F5F1E9',   // Bone
    colorText:       '#1C1B18',   // Ink
    colorInputBackground: '#E7E0D3', // Sand
    borderRadius:    '0.375rem',
    fontFamily:      "'Inter Variable', system-ui, sans-serif",
  },
  elements: {
    card:         'shadow-none border border-[#E7E0D3]',
    headerTitle:  "font-['Fraunces_Variable',serif] text-2xl",
    formButtonPrimary: 'bg-[#B87333] hover:bg-[#9a6128] text-white',
  },
}
```

---

## File: packages/shared/src/index.ts

```typescript
export * from './types'
export * from './constants'
export * from './api'
export * from './cloudinary'
export * from './clerkAppearance'
```

---

## Verification

After creating all files, verify the shared package is importable from agent app:

In `apps/agent/src/main.tsx`, temporarily add:
```tsx
import { SKILL_TYPES, formatPriceLabel } from '@carry/shared'
console.log(SKILL_TYPES, formatPriceLabel(8500000))  // should log "₹85.00 L"
```

Run `npm run dev:agent` and check browser console — should show the constants with no import error.

Remove the test import after confirming.

**✓ Phase 0, File 01 complete. Proceed to `01_database/00_prisma_schema.md`.**
