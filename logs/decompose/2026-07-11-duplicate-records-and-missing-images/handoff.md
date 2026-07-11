# Handoff: Duplicate Sync Records and Missing Images Resolved

## Changes Made

### 1. UploadManager (`apps/agent/src/lib/UploadManager.ts`)
- Modified `getAdaptiveMaxWorkers()` to return `1` when offline.
- This allows local image compression to run and enqueue images into IndexedDB even while disconnected.

### 2. Properties API Route (`apps/api/src/routes/properties.ts`)
- Added optional `id` parameter to POST `/properties` schema.
- Wrapped database insertion in a try-catch catching `P2002` (unique constraint violation). On duplicate, it queries and returns the existing property.

### 3. Labour API Route (`apps/api/src/routes/labour.ts`)
- Added optional `id` parameter to POST `/labour` schema.
- Implemented the same try-catch idempotency query block on conflict.

### 4. Property Form (`apps/agent/src/pages/Properties/PropertyForm.tsx`)
- Imported and initialized `submittingRef = useRef(false)`.
- Blocked double submit triggers in the same event tick.
- Generated `recordId = crypto.randomUUID()` client-side.
- Added `id: recordId` to payload.

### 5. Labour Form (`apps/agent/src/pages/Labour/LabourForm.tsx`)
- Added `submittingRef` double click protection.
- Generated `recordId` client-side and added `id` to payload.
