# Carry Construction — Field Ops Tool
## Full Architecture & Implementation Plan

> **Internal use only.** Separate monorepo from the public Carry Construction website.
> Built for ground-level real estate agents who collect field data on properties, construction projects, and labourers.

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Tech Stack & Decisions](#2-tech-stack--decisions)
3. [Database Schema (Prisma)](#3-database-schema-prisma)
4. [API Architecture (Fastify)](#4-api-architecture-fastify)
5. [Authentication Flow (Clerk)](#5-authentication-flow-clerk)
6. [Image Upload System](#6-image-upload-system)
7. [Agent App](#7-agent-app-appsagent)
8. [Admin App](#8-admin-app-appsadmin)
9. [Shared Package](#9-shared-package-packagesshared)
10. [Environment Variables](#10-environment-variables)
11. [Build & Dev Scripts](#11-build--dev-scripts)
12. [Phased Build Plan](#12-phased-build-plan)

---

## 1. Monorepo Structure

```
carry-field-ops/                        ← NEW repo (separate from public website)
│
├── apps/
│   ├── agent/                          # Field agent web app (mobile-first PWA)
│   │   ├── public/
│   │   │   └── sw.js                   # Service Worker (offline upload queue)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── PhotoUploader/
│   │   │   │   │   ├── PhotoUploader.tsx
│   │   │   │   │   ├── PhotoCard.tsx
│   │   │   │   │   └── StatusBar.tsx
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   ├── FormField.tsx
│   │   │   │   └── LocationPicker.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePhotoUpload.ts
│   │   │   ├── lib/
│   │   │   │   ├── UploadManager.ts    # Worker pool + queue state machine
│   │   │   │   ├── compress.ts         # Canvas-based compression
│   │   │   │   ├── uploadQueue.ts      # IndexedDB offline queue (idb)
│   │   │   │   └── api.ts
│   │   │   ├── pages/
│   │   │   │   ├── Properties/
│   │   │   │   │   ├── PropertyForm.tsx
│   │   │   │   │   └── PropertyList.tsx
│   │   │   │   ├── Projects/
│   │   │   │   │   ├── ProjectForm.tsx
│   │   │   │   │   └── ProjectList.tsx
│   │   │   │   ├── Labour/
│   │   │   │   │   ├── LabourForm.tsx
│   │   │   │   │   └── LabourList.tsx
│   │   │   │   └── Profile.tsx
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── admin/                          # Admin dashboard (desktop-first)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── RecordDetail.tsx
│   │   │   │   └── ImageViewer.tsx     # Full-quality download
│   │   │   ├── pages/
│   │   │   │   ├── Agents.tsx
│   │   │   │   ├── Properties.tsx
│   │   │   │   ├── Projects.tsx
│   │   │   │   ├── Labour.tsx
│   │   │   │   └── Login.tsx
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                            # Fastify backend
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── dev.db                  # SQLite (gitignored)
│       ├── src/
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── auth.ts             # JWT middleware (no Clerk API call)
│       │   │   └── cloudinary.ts
│       │   ├── routes/
│       │   │   ├── health.ts
│       │   │   ├── properties.ts
│       │   │   ├── projects.ts
│       │   │   ├── labour.ts
│       │   │   ├── agents.ts
│       │   │   └── uploads.ts
│       │   └── server.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types.ts
│       │   ├── constants.ts
│       │   ├── api.ts
│       │   ├── cloudinary.ts
│       │   └── clerkAppearance.ts
│       ├── index.ts
│       └── package.json
│
├── package.json                        # Root — workspaces + concurrently
└── .gitignore
```

---

## 2. Tech Stack & Decisions

### Why this stack for low-end devices / poor networks

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite | Small runtime, excellent tree-shaking |
| Styling | TailwindCSS v4 | Zero runtime CSS |
| Backend | Fastify + TypeScript | ~10× faster than Express, tiny memory |
| ORM | Prisma + SQLite | Zero-setup dev, one-line switch to Postgres |
| Auth | Clerk | Hosted, no auth code to maintain |
| Images | Cloudinary | CDN + URL-param quality transformations |
| Offline queue | IndexedDB + Background Sync | Built into browsers — 0 KB added |
| Image compression | Canvas API | Built into browsers — 0 KB added |
| Fonts | @fontsource (self-hosted) | Works offline after first load |

### Packages to install (non-built-ins only)

```
Agent app:    idb (~3 KB)  +  @clerk/clerk-react
Admin app:    @clerk/clerk-react
API:          fastify  @fastify/cors  @fastify/rate-limit
              @fastify/swagger  @fastify/swagger-ui
              @clerk/backend  @prisma/client  prisma  tsx
```

> **No React Query, Axios, Redux, Three.js, or Framer Motion in agent/admin.**
> Target: agent app bundle under 300 KB gzipped.

---

## 3. Database Schema (Prisma)

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"         // change to "postgresql" for production
  url      = env("DATABASE_URL")
}

// ── Agents ─────────────────────────────────────────────────────────────

model Agent {
  id          String   @id @default(cuid())
  clerkUserId String   @unique
  name        String
  email       String   @unique
  status      String   @default("active")  // "active" | "revoked"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  properties  Property[]
  projects    ConstructionProject[]
  labour      Labour[]

  @@index([clerkUserId])
}

// ── Properties ─────────────────────────────────────────────────────────

model Property {
  id           String   @id @default(cuid())
  title        String
  propertyType String   // "Apartment" | "Villa" | "Plot" | "Commercial"
  listingType  String   // "Sale" | "Resale" | "Under Construction"
  bhk          Int?
  priceInr     Int
  priceLabel   String   // pre-formatted "₹1.35 Cr"
  areaSqft     Int
  locality     String
  city         String
  address      String?
  reraNumber   String?
  status       String   // "Ready" | "Under Construction"
  furnishing   String?  // "Unfurnished" | "Semi-Furnished" | "Furnished"
  description  String?
  images       String   @default("[]")  // JSON array of Cloudinary public IDs
  floorPlanUrl String?                  // single Cloudinary public ID
  lat          Float?
  lng          Float?
  reviewStatus String   @default("pending") // "pending" | "reviewed" | "deleted"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  agentId      String
  agent        Agent    @relation(fields: [agentId], references: [id])

  @@index([agentId, reviewStatus])
  @@index([city, listingType, propertyType])
}

// ── Construction Projects ───────────────────────────────────────────────

model ConstructionProject {
  id             String   @id @default(cuid())
  title          String
  category       String   // "Turnkey Villa" | "Renovation" | "Interior" | "Commercial Build"
  location       String
  areaSqft       Int?
  durationMonths Int?
  packageTier    String?  // "Basic" | "Premium" | "Luxury"
  description    String?
  beforeImages   String   @default("[]")  // JSON array of Cloudinary public IDs
  afterImages    String   @default("[]")
  stageImages    String   @default("[]")
  reviewStatus   String   @default("pending")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  agentId        String
  agent          Agent    @relation(fields: [agentId], references: [id])

  @@index([agentId, reviewStatus])
}

// ── Labour ─────────────────────────────────────────────────────────────

model Labour {
  id              String   @id @default(cuid())
  fullName        String
  age             Int
  gender          String   // "Male" | "Female" | "Other"
  skillLevel      String   // "Skilled" | "Non-Skilled"
  skillType       String?  // only if Skilled — from SKILL_TYPES
  phone           String
  profilePhotoUrl String?  // Cloudinary public ID
  houseNo         String?
  street          String?
  locality        String?
  city            String?
  pincode         String?
  reviewStatus    String   @default("pending")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  agentId         String
  agent           Agent    @relation(fields: [agentId], references: [id])

  @@index([agentId, reviewStatus])
  @@index([city, skillLevel, skillType])
}
```

> **Images are stored as Cloudinary public IDs** (e.g. `properties/abc123`), not full URLs.
> Full URLs with transformation params are constructed at read time — lets you change CDN
> config without a DB migration.

---

## 4. API Architecture (Fastify)

**Base:** `http://localhost:4001/api/v1`  
**Swagger:** `http://localhost:4001/api/docs`

### Route Map

```
GET    /health                               → no auth

── Agent routes (Bearer token, role: "agent") ─────────────────────────
POST   /properties                           submit property
GET    /properties/mine                      own submissions (paginated)
POST   /projects                             submit project
GET    /projects/mine
POST   /labour                               submit labour profile
GET    /labour/mine
GET    /uploads/sign?folder=xxx              Cloudinary upload signature
PATCH  /uploads/patch-queued                 SW calls this after offline upload

── Admin routes (Bearer token, role: "admin") ─────────────────────────
GET    /properties                           all submissions + filters + pagination
PATCH  /properties/:id                       update reviewStatus
DELETE /properties/:id

GET    /projects
PATCH  /projects/:id
DELETE /projects/:id

GET    /labour
PATCH  /labour/:id
DELETE /labour/:id

GET    /agents                               Clerk user list (role: agent)
POST   /agents/invite                        send Clerk invitation by email
DELETE /agents/:clerkUserId                  revoke agent role
```

### Auth Middleware — JWT Claims Only (zero Clerk API calls per request)

```typescript
// apps/api/src/lib/auth.ts
import { verifyToken } from '@clerk/backend'

// Role lives in the JWT itself via Clerk session customization.
// Clerk Dashboard → Sessions → Customize session token:
//   { "role": "{{user.public_metadata.role}}" }
//
// This means verifyToken() does a local crypto check only — no HTTP call to Clerk.

async function extractRole(request: FastifyRequest): Promise<string | null> {
  const token = request.headers.authorization?.replace('Bearer ', '') ?? ''
  if (!token) return null
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! })
    return (payload as any).role ?? null
  } catch { return null }
}

export async function requireAgent(req: FastifyRequest, reply: FastifyReply) {
  const role = await extractRole(req)
  if (role !== 'agent')
    return reply.code(role ? 403 : 401).send({ error: role ? 'Forbidden' : 'Unauthorized' })
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const role = await extractRole(req)
  if (role !== 'admin')
    return reply.code(role ? 403 : 401).send({ error: role ? 'Forbidden' : 'Unauthorized' })
}
```

### Uploads Route — Parameterised Folder + Size Limit

```typescript
// GET /uploads/sign?folder=properties|projects|labour
app.get('/uploads/sign', { preHandler: requireAgent }, async (req, reply) => {
  const folder = (req.query as any).folder ?? 'properties'
  const allowed = ['properties', 'projects', 'labour']
  if (!allowed.includes(folder))
    return reply.code(400).send({ error: 'Invalid folder' })

  const timestamp = Math.round(Date.now() / 1000)
  const maxBytes  = 15 * 1024 * 1024   // 15 MB safety net (client already compressed)
  const paramStr  = `folder=${folder}&max_bytes=${maxBytes}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1')
    .update(paramStr + process.env.CLOUDINARY_API_SECRET)
    .digest('hex')

  return { signature, timestamp, maxBytes,
           apiKey: process.env.CLOUDINARY_API_KEY,
           cloudName: process.env.CLOUDINARY_CLOUD_NAME, folder }
})

// PATCH /uploads/patch-queued — called by Service Worker after offline upload
// Updates the DB record with the now-available Cloudinary public ID
app.patch('/uploads/patch-queued', { preHandler: requireAgent }, async (req, reply) => {
  const { model, recordId, fieldName, publicId } = req.body as any
  // model: 'property' | 'project' | 'labour'
  // fieldName: 'images' | 'beforeImages' | 'afterImages' | 'stageImages' | 'profilePhotoUrl'
  // Appends publicId to the JSON array in the DB column, or sets the single-image field
})
```

---

## 5. Authentication Flow (Clerk)

### One-time Clerk Dashboard Setup

```
1. Sessions → Customize session token — add:
   { "role": "{{user.public_metadata.role}}" }

2. Agent invite → API sets publicMetadata: { role: "agent" } on invitation
3. Admin set manually → tsx scripts/set-admin-role.ts <email>
```

### Invite Flow

```
Admin: "Invite Agent" button
  → POST /agents/invite { email }
  → clerkClient.invitations.createInvitation({
      emailAddress,
      publicMetadata: { role: "agent" }
    })
  → Clerk sends magic-link email
  → Agent clicks → creates account → role: "agent" in metadata
  → Agent opens apps/agent → ClerkProvider sees session
  → App checks JWT role claim → if not "agent" → "Access denied" screen
```

### Revoke Flow

```
Admin: "Revoke" on agent row
  → DELETE /agents/:clerkUserId
  → clerkClient.users.updateUserMetadata(id, { publicMetadata: { role: null } })
  → Agent's next API call → JWT has no role → 401/403
  → Agent app → shows "Your access has been revoked" screen
```

---

## 6. Image Upload System

### Full Pipeline

```
Agent selects photos (any time, unlimited)
          │
          ▼
  [Instant thumbnail]           URL.createObjectURL() — shown before upload starts
          │
          ▼
  [Compress — Canvas API]       1920px max width, 0.82 JPEG quality → ~600 KB–1 MB
          │
          ▼
  navigator.onLine?
    YES → XHR to Cloudinary ─→ returns { public_id } ─→ mark photo as ✓ Done
    NO  → store blob in IndexedDB
          register BackgroundSync("upload-queue")
          mark photo as 📶 Queued
               │
         network returns
               │
         Service Worker wakes (Background Sync)
               │
         upload blob to Cloudinary
               │
         PATCH /uploads/patch-queued on API
               │
         DB record updated with public_id
```

### Adaptive Worker Pool

```typescript
// Number of concurrent uploads depends on detected connection
function getMaxWorkers(): number {
  const conn = (navigator as any).connection
  if (!navigator.onLine) return 0
  if (conn?.saveData) return 1
  switch (conn?.effectiveType) {
    case '2g':  return 1
    case '3g':  return 2
    default:    return 3   // 4g or unknown
  }
}
```

### UploadManager State Machine (per photo)

```
waiting → compressing → uploading → done
                    ↘              ↗
                     queued  (offline)
                         ↓
                    (SW uploads later)
                         ↓
                       done
               ↘
               failed → (tap to retry) → waiting
```

### Concurrent + Non-blocking: How it Works

```
Agent adds Photo A → compressing... uploading 45%
Agent adds Photo B → compressing...            ← starts immediately, doesn't wait for A
Agent adds Photo C → waiting                   ← MAX_WORKERS=2, C waits for A or B to finish
A finishes         → C starts immediately
```

- New photos are appended to the queue and **never block the UI**
- Each photo card shows its own independent status and progress ring
- The form can be submitted **even if photos are still uploading** — queued placeholders are resolved later by the Service Worker

### Cloudinary URL Strategy

Store **public IDs** in DB. Build URLs at read time:

```typescript
// packages/shared/src/cloudinary.ts
export const img = {
  thumb:    (id: string) => `https://res.cloudinary.com/${CLOUD}/image/upload/w_400,q_70,f_auto/${id}`,
  card:     (id: string) => `https://res.cloudinary.com/${CLOUD}/image/upload/w_800,q_auto,f_auto/${id}`,
  full:     (id: string) => `https://res.cloudinary.com/${CLOUD}/image/upload/q_100/${id}`,
  download: (id: string, name: string) =>
    `https://res.cloudinary.com/${CLOUD}/image/upload/fl_attachment:${name},q_100/${id}`,
}
```

One upload → Cloudinary serves the right quality to each viewer via URL params.

### IndexedDB Schema (via `idb`)

```typescript
interface PendingUpload {
  id:        number    // auto-increment
  localId:   string    // matches PhotoItem.id in UploadManager
  model:     'property' | 'project' | 'labour'
  recordId:  string    // DB record ID — set after form submits
  fieldName: string    // 'images' | 'beforeImages' | 'profilePhotoUrl'
  blob:      Blob      // compressed image
  fileName:  string
  folder:    string    // 'properties' | 'projects' | 'labour'
  createdAt: number
  attempts:  number    // retry counter (max 5)
}
```

### Service Worker

```javascript
// apps/agent/public/sw.js

self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-queue') {
    event.waitUntil(flushUploadQueue())
  }
})

async function flushUploadQueue() {
  const pending = await getPendingUploads()            // from IndexedDB
  for (const item of pending) {
    if (item.attempts >= 5) continue                   // give up after 5 tries
    try {
      const { sig, ts, key, cloud, folder } = await getSignature(item.folder)
      const publicId = await uploadToCloudinary(item.blob, item.fileName, sig, ts, key, cloud, folder)
      await patchAPI(item.model, item.recordId, item.fieldName, publicId)
      await removePendingUpload(item.id)
    } catch {
      await incrementAttempts(item.id)
    }
  }
}
```

---

## 7. Agent App (apps/agent)

**Port: 5181** | Mobile-first PWA

### Design Tokens

```css
:root {
  --ink:      #1C1B18;  /* primary text, nav bg */
  --bone:     #F5F1E9;  /* page background */
  --ochre:    #B87333;  /* CTA, active state */
  --concrete: #8B857A;  /* secondary text, borders */
  --sand:     #E7E0D3;  /* card bg, input fill */
  --steel:    #2E3A40;  /* dark accents */

  --font-heading: 'Fraunces Variable', serif;
  --font-body:    'Inter Variable', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}
```

### Navigation

```
Sticky bottom nav (4 tabs):
  🏠 Properties  |  🏗 Projects  |  👷 Labour  |  👤 Profile

Each tab:
  • Form view  (default — agent is in field)
  • List view  (their own submissions, paginated, pull-to-refresh)
```

### Property Form Fields

```
Title                   text
Property Type           chips: Apartment | Villa | Plot | Commercial
Listing Type            chips: Sale | Resale | Under Construction
BHK                     stepper: 1 2 3 4 5+  (optional)
Price (INR)             number → auto-label (₹X.XX Cr / Lakh)
Area (sq ft)            number
Locality                text
City                    text
Address                 textarea (optional)
RERA Number             text (optional)
Property Status         chips: Ready | Under Construction
Furnishing              chips: Unfurnished | Semi | Furnished  (optional)
Description             textarea (optional)
Photos                  PhotoUploader — unlimited, concurrent, offline-aware
Floor Plan              single image (optional)
Location                [📍 Auto-detect] + manual lat/lng inputs
```

### Labour Form Fields

```
Full Name               text
Age                     number
Gender                  chips: Male | Female | Other
Skill Level             chips: Skilled | Non-Skilled
Skill Type              dropdown (shown only if Skilled):
                          Mason / Bricklayer
                          Painter | Electrician | Plumber
                          Carpenter / Woodworker
                          Welder / Fabricator
                          Tile Setter / Flooring
                          Roofer
                          Civil Helper / General Labour
Phone                   tel input
Profile Photo           single image (optional)
─── Availability Area ───
  House No / Building   text
  Street / Area         text
  Locality              text
  City                  text
  Pincode               6-digit text
```

### Form Persistence (localStorage)

```typescript
// Key: carry:form:<type>:<clerkUserId>
// Saved: debounced 500ms on every input change
// Restored: on component mount
// Cleared: after successful API submission
```

### Mobile UX Rules

- `<input type="file" accept="image/*" capture="environment">` — opens camera directly
- All touch targets ≥ 48×48px
- Bottom nav: `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))` (iOS safe area)
- Network banner: `"📵 No signal — changes saved locally"` / `"✓ Back online — syncing..."`
- Submit button: fixed at bottom of screen above nav
- Error messages: inline below each field (never cover input with a toast)
- Geolocation: always show a loading spinner + timeout after 15s with fallback to manual input

---

## 8. Admin App (apps/admin)

**Port: 5182** | Desktop-first

### Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Carry Construction (logo)              Admin: Name  Sign out  │
├────────────┬──────────────────────────────────────────────────┤
│            │                                                   │
│  Agents    │                                                   │
│  ───────── │           Main content area                      │
│  Properties│           Table / Detail view                    │
│  Projects  │                                                   │
│  Labour    │                                                   │
│            │                                                   │
└────────────┴──────────────────────────────────────────────────┘
  Sidebar 240px         Content flex-1
```

### Agents Page

```
Agents (12 active, 2 pending)              [+ Invite Agent]

Name        Email               Status      Action
──────────────────────────────────────────────────
Rahul K.    rahul@...           ● Active    [Revoke]
Priya M.    priya@...           ○ Pending    —

Invite modal → email field → "Send Invitation" button
```

### Properties Inbox

```
Filters: [Agent ▾] [Type ▾] [Listing ▾] [Status ▾]   [Search title/city...]

Img  │ Title            │ Type  │ Location │ Price   │ Agent     │ Status   │ Actions
─────┼──────────────────┼───────┼──────────┼─────────┼───────────┼──────────┼────────
🖼   │ 3BHK, Baner      │ Sale  │ Pune     │ ₹85 L   │ Rahul K.  │ Pending  │ [View] [✓] [🗑]

Detail panel → all fields + photo gallery + [Download Original] per image + map
```

### Labour Inbox

```
Filters: [Gender ▾] [Skill Level ▾] [Skill Type ▾] [City ▾]

Photo │ Name       │ Age │ Gender │ Skill              │ City  │ Actions
──────┼────────────┼─────┼────────┼────────────────────┼───────┼────────
👤    │ Ramesh B.  │ 34  │ Male   │ Skilled — Mason    │ Pune  │ [View] [✓] [🗑]
```

---

## 9. Shared Package (packages/shared)

### `types.ts`

```typescript
export type PropertyType  = 'Apartment' | 'Villa' | 'Plot' | 'Commercial'
export type ListingType   = 'Sale' | 'Resale' | 'Under Construction'
export type PropertyStatus = 'Ready' | 'Under Construction'
export type FurnishingType = 'Unfurnished' | 'Semi-Furnished' | 'Furnished'
export type ReviewStatus  = 'pending' | 'reviewed' | 'deleted'
export type SkillLevel    = 'Skilled' | 'Non-Skilled'
export type PackageTier   = 'Basic' | 'Premium' | 'Luxury'
export type Gender        = 'Male' | 'Female' | 'Other'

export interface Agent {
  id: string; clerkUserId: string; name: string; email: string;
  status: 'active' | 'revoked'; createdAt: string;
}

export interface Property {
  id: string; title: string; propertyType: PropertyType;
  listingType: ListingType; bhk?: number; priceInr: number;
  priceLabel: string; areaSqft: number; locality: string; city: string;
  address?: string; reraNumber?: string; status: PropertyStatus;
  furnishing?: FurnishingType; description?: string;
  images: string[];        // Cloudinary public IDs
  floorPlanUrl?: string;   // Cloudinary public ID
  lat?: number; lng?: number;
  reviewStatus: ReviewStatus; agentId: string;
  createdAt: string; updatedAt: string;
}

export interface ConstructionProject {
  id: string; title: string; category: string; location: string;
  areaSqft?: number; durationMonths?: number; packageTier?: PackageTier;
  description?: string;
  beforeImages: string[]; afterImages: string[]; stageImages: string[];
  reviewStatus: ReviewStatus; agentId: string;
  createdAt: string; updatedAt: string;
}

export interface Labour {
  id: string; fullName: string; age: number; gender: Gender;
  skillLevel: SkillLevel; skillType?: string; phone: string;
  profilePhotoUrl?: string;
  houseNo?: string; street?: string; locality?: string; city?: string; pincode?: string;
  reviewStatus: ReviewStatus; agentId: string;
  createdAt: string; updatedAt: string;
}

export interface Paginated<T> {
  data: T[]; total: number; page: number; limit: number;
}
```

### `constants.ts`

```typescript
export const SKILL_TYPES = [
  'Mason / Bricklayer', 'Painter', 'Electrician', 'Plumber',
  'Carpenter / Woodworker', 'Welder / Fabricator', 'Tile Setter / Flooring',
  'Roofer', 'Civil Helper / General Labour',
] as const

export const PROJECT_CATEGORIES = [
  'Turnkey Villa', 'Renovation', 'Interior', 'Commercial Build',
] as const

export const PROPERTY_TYPES:  readonly string[] = ['Apartment', 'Villa', 'Plot', 'Commercial']
export const LISTING_TYPES:   readonly string[] = ['Sale', 'Resale', 'Under Construction']
export const PACKAGE_TIERS:   readonly string[] = ['Basic', 'Premium', 'Luxury']
export const FURNISHING_TYPES: readonly string[] = ['Unfurnished', 'Semi-Furnished', 'Furnished']
```

### `api.ts` — Typed Fetch Client with Timeout

```typescript
const DEFAULT_TIMEOUT = 15_000  // 15 seconds

async function request<T>(path: string, init: RequestInit & { timeout?: number } = {}): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...options } = init
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  const res = await fetch(`${import.meta.env.VITE_API_BASE}${path}`, {
    ...options,
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  }).finally(() => clearTimeout(id))

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? 'Request failed'), { status: res.status })
  }

  return res.json()
}

export const api = {
  get:    <T>(path: string, token?: string) =>
    request<T>(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  post:   <T>(path: string, body: unknown, token: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` } }),
  patch:  <T>(path: string, body: unknown, token: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` } }),
  delete: <T>(path: string, token: string) =>
    request<T>(path, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
}
```

---

## 10. Environment Variables

### `apps/api/.env`
```env
DATABASE_URL="file:./prisma/dev.db"
PORT=4001
CORS_ORIGIN="http://localhost:5181,http://localhost:5182"
CLERK_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=carry-construction
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### `apps/agent/.env`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE=http://localhost:4001/api/v1
VITE_CLOUDINARY_CLOUD_NAME=carry-construction
```

### `apps/admin/.env`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE=http://localhost:4001/api/v1
VITE_CLOUDINARY_CLOUD_NAME=carry-construction
```

---

## 11. Build & Dev Scripts

### Root `package.json`

```json
{
  "name": "carry-field-ops",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently -k -n api,agent,admin -c blue,green,magenta \"npm run dev -w apps/api\" \"npm run dev -w apps/agent\" \"npm run dev -w apps/admin\"",
    "dev:api":    "npm run dev -w apps/api",
    "dev:agent":  "npm run dev -w apps/agent",
    "dev:admin":  "npm run dev -w apps/admin",
    "build":      "npm run build -w apps/agent && npm run build -w apps/admin && npm run build -w apps/api",
    "db:push":    "npm run prisma:push -w apps/api",
    "db:studio":  "npm run prisma:studio -w apps/api"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

---

## 12. Phased Build Plan

### Phase 1 — Foundation (Day 1–2)
- [ ] Init monorepo with npm workspaces
- [ ] Scaffold all four directories (`apps/agent`, `apps/admin`, `apps/api`, `packages/shared`)
- [ ] Set up Prisma schema → run `npm run db:push`
- [ ] Fastify server boots with Swagger at `/api/docs`
- [ ] Clerk Dashboard: add role claim to session token
- [ ] `requireAgent` and `requireAdmin` middleware (JWT claims, no Clerk HTTP call)
- [ ] `GET /health` returns `{ ok: true }`
- [ ] All three services start with `npm run dev`

### Phase 2 — API Routes (Day 3–4)
- [ ] `POST /properties`, `GET /properties/mine`
- [ ] `POST /projects`, `GET /projects/mine`
- [ ] `POST /labour`, `GET /labour/mine`
- [ ] `GET /uploads/sign?folder=xxx`
- [ ] `PATCH /uploads/patch-queued`
- [ ] Admin: list all + PATCH reviewStatus + DELETE for all three models
- [ ] Admin: agent management routes (invite, list, revoke via Clerk API)

### Phase 3 — Shared Package (Day 4)
- [ ] All TypeScript types and constants
- [ ] Typed API client with 15s AbortController timeout
- [ ] Cloudinary URL helpers
- [ ] Clerk appearance config

### Phase 4 — Image Upload System (Day 5–6)
- [ ] `compress.ts` — Canvas API (1920px, 0.82 quality)
- [ ] `UploadManager.ts` — adaptive worker pool (1–3 workers based on network type)
- [ ] `uploadQueue.ts` — IndexedDB store with `idb`
- [ ] `usePhotoUpload.ts` — React hook
- [ ] `PhotoUploader.tsx` + `PhotoCard.tsx` — per-photo progress rings
- [ ] `sw.js` — Service Worker Background Sync
- [ ] Full test: add 10 photos → disable WiFi → submit form → re-enable → verify all appear in DB

### Phase 5 — Agent App UI (Day 7–10)
- [ ] CSS design system (tokens, fonts, utilities)
- [ ] `BottomNav.tsx` with iOS safe area inset
- [ ] `FormField.tsx` reusable input
- [ ] `LocationPicker.tsx` — geolocation + manual fallback
- [ ] Property form + localStorage persistence
- [ ] Construction project form (3 photo sections)
- [ ] Labour form (conditional Skill Type field)
- [ ] List views (own submissions, paginated)
- [ ] Profile page + sync status indicator
- [ ] Network status banner
- [ ] Clerk access guard (role: agent only)

### Phase 6 — Admin App UI (Day 11–14)
- [ ] Sidebar layout
- [ ] Clerk admin role guard
- [ ] `DataTable.tsx` — sortable, filterable, paginated
- [ ] Properties inbox + full detail + photo gallery + per-image download
- [ ] Projects inbox + detail
- [ ] Labour inbox + detail
- [ ] Agent management page — invite modal + revoke

### Phase 7 — Polish & Hardening (Day 15–16)
- [ ] Vite manual chunks: `vendor` (react/react-dom) + `clerk`
- [ ] `font-display: swap` on all font faces (prevent invisible text on 3G)
- [ ] Audit: agent app bundle < 300 KB gzipped
- [ ] Fastify `requestTimeout: 30_000`
- [ ] Real device test: actual Android phone on 3G hotspot
- [ ] Offline test: kill network mid-upload → restore → verify DB
- [ ] Final Swagger docs review + `.env.example` files

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Auth per request | JWT claims only | No Clerk HTTP round-trip per request |
| Image DB storage | Cloudinary public IDs | URL transformation without DB changes |
| Offline photos | IndexedDB + Background Sync | Built-in, 0 KB added to bundle |
| Form state | localStorage | Survives tab close + network loss |
| Compression | Canvas API | 0 KB, 6 MB phone photo → ~700 KB |
| Upload concurrency | Adaptive pool 1–3 | Matches network capacity |
| Fonts | @fontsource self-hosted | Offline after first load, no DNS lookup |
| Dev database | SQLite | Zero setup, Postgres ready via single Prisma flag |
