# File 01 — Extract `packages/logic`

> **Antigravity Instructions:**
> Create the `@carry/logic` package. This extracts all platform-agnostic logic from the web agent app so both the web app and the new React Native app can share it.
> Execute every task in order. Do not skip any file.

---

## Context

The existing web app (`apps/agent`) has logic tightly coupled to browser APIs (IndexedDB, localStorage, `navigator`). This phase pulls out everything that is pure TypeScript — no DOM, no browser, no React Native — into a shared workspace package.

---

## Task 1 — Create `packages/logic/package.json`

Create file: `packages/logic/package.json`

```json
{
  "name": "@carry/logic",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./forms/property": "./src/forms/property.ts",
    "./forms/labour": "./src/forms/labour.ts",
    "./forms/shop": "./src/forms/shop.ts",
    "./hooks/useOfflineList": "./src/hooks/useOfflineList.ts",
    "./hooks/useFormPersist": "./src/hooks/useFormPersist.ts",
    "./lib/uuid": "./src/lib/uuid.ts",
    "./lib/price": "./src/lib/price.ts"
  },
  "peerDependencies": {
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

## Task 2 — Create `packages/logic/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## Task 3 — Create UUID utility

Create file: `packages/logic/src/lib/uuid.ts`

```ts
/**
 * generateUUID — cross-platform UUID v4.
 * Works in browser (crypto.randomUUID), React Native (Math.random fallback),
 * and Node.js environments.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

---

## Task 4 — Create price utility

Create file: `packages/logic/src/lib/price.ts`

```ts
/**
 * formatPriceLabel — converts raw INR number to display string.
 * Re-exports from @carry/shared for convenience.
 */
export { formatPriceLabel } from '@carry/shared'
```

---

## Task 5 — Create StorageAdapter interface

Create file: `packages/logic/src/adapters.ts`

```ts
// ── StorageAdapter ────────────────────────────────────────────────────────────
// Implemented per-platform:
//   Web (apps/agent):          IndexedDB via idb
//   Native (apps/agent-native): expo-sqlite

export interface StorageAdapter {
  save(key: string, data: unknown[], total: number): Promise<void>
  load(key: string): Promise<{ data: unknown[]; total: number; cachedAt: number } | null>
}

// ── KVAdapter ─────────────────────────────────────────────────────────────────
// Implemented per-platform:
//   Web (apps/agent):          localStorage
//   Native (apps/agent-native): react-native-mmkv

export interface KVAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): void
}
```

---

## Task 6 — Create `useOfflineList` factory hook

Create file: `packages/logic/src/hooks/useOfflineList.ts`

```ts
import { useState, useEffect, useCallback, useRef } from 'react'
import type { StorageAdapter } from '../adapters'

export interface OfflineListResult<T> {
  data:      T[]
  total:     number
  loading:   boolean
  error:     string | null
  fromCache: boolean        // true = offline, showing stale data
  cachedAt:  number | null  // unix timestamp of last successful sync
  refetch:   () => void
}

/**
 * createOfflineListHook — factory that binds a StorageAdapter to the
 * offline-first list fetching pattern.
 *
 * Usage:
 *   // Web app (apps/agent):
 *   export const useOfflineList = createOfflineListHook(indexedDBAdapter)
 *
 *   // Native app (apps/agent-native):
 *   export const useOfflineList = createOfflineListHook(sqliteAdapter)
 */
export function createOfflineListHook(storage: StorageAdapter) {
  return function useOfflineList<T>(
    cacheKey: string,
    fetcher: () => Promise<{ data: T[]; total: number }>
  ): OfflineListResult<T> {
    const [data,      setData]      = useState<T[]>([])
    const [total,     setTotal]     = useState(0)
    const [loading,   setLoading]   = useState(true)
    const [error,     setError]     = useState<string | null>(null)
    const [fromCache, setFromCache] = useState(false)
    const [cachedAt,  setCachedAt]  = useState<number | null>(null)

    const fetcherRef = useRef(fetcher)
    useEffect(() => { fetcherRef.current = fetcher }, [fetcher])

    const load = useCallback(async () => {
      setLoading(true)
      setError(null)

      // Step 1: Serve from cache immediately for instant display
      try {
        const cached = await storage.load(cacheKey)
        if (cached) {
          setData(cached.data as T[])
          setTotal(cached.total)
          setCachedAt(cached.cachedAt)
          setFromCache(true)
          setLoading(false)
        }
      } catch {
        // Storage unavailable — continue to network
      }

      // Step 2: Try the network
      try {
        const res = await fetcherRef.current()
        setData(res.data)
        setTotal(res.total)
        setFromCache(false)
        setError(null)
        setCachedAt(Date.now())
        await storage.save(cacheKey, res.data as unknown[], res.total)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load data'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }, [cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load() }, [load])

    return { data, total, loading, error, fromCache, cachedAt, refetch: load }
  }
}

// ── Formatting helper ─────────────────────────────────────────────────────────
export function formatCachedAt(cachedAt: number): string {
  const diff = Date.now() - cachedAt
  const mins = Math.floor(diff / 60_000)
  const hrs  = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}
```

---

## Task 7 — Create `useFormPersist` factory hook

Create file: `packages/logic/src/hooks/useFormPersist.ts`

```ts
import { useState, useCallback } from 'react'
import type { KVAdapter } from '../adapters'

export interface FormPersistResult<T> {
  form:   T
  update: (patch: Partial<T>) => void
  clear:  () => void
}

/**
 * createFormPersistHook — factory that binds a KVAdapter to the
 * form draft persistence pattern.
 *
 * Usage:
 *   // Web app (apps/agent):
 *   export const useFormPersist = createFormPersistHook(localStorageAdapter)
 *
 *   // Native app (apps/agent-native):
 *   export const useFormPersist = createFormPersistHook(mmkvAdapter)
 */
export function createFormPersistHook(kv: KVAdapter) {
  return function useFormPersist<T extends object>(
    key: string,
    initial: T
  ): FormPersistResult<T> {
    const [form, setForm] = useState<T>(() => {
      try {
        const saved = kv.get(key)
        if (saved) return { ...initial, ...JSON.parse(saved) }
      } catch {
        // Corrupted storage — start fresh
      }
      return initial
    })

    const update = useCallback((patch: Partial<T>) => {
      setForm(prev => {
        const next = { ...prev, ...patch }
        try { kv.set(key, JSON.stringify(next)) } catch { /* ignore */ }
        return next
      })
    }, [key])

    const clear = useCallback(() => {
      kv.delete(key)
      setForm(initial)
    }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

    return { form, update, clear }
  }
}
```

---

## Task 8 — Create Property form state

Create file: `packages/logic/src/forms/property.ts`

```ts
import type { PropertyType, ListingType, PropertyStatus, FurnishingType } from '@carry/shared'

export interface PropertyFormState {
  title:              string
  propertyType:       PropertyType
  listingType:        ListingType
  bhk:                number
  priceInr:           string
  areaSqft:           string
  locality:           string
  city:               string
  address:            string
  reraNumber:         string
  status:             PropertyStatus
  furnishing:         FurnishingType
  description:        string
  lat:                number | undefined
  lng:                number | undefined
  // Rent-specific
  securityDeposit:    string
  availableFrom:      string
  preferredTenant:    string
  petFriendly:        boolean
  maintenanceCharges: string
  leaseDuration:      string
  lockInPeriod:       string
  camCharges:         string
  plotAllowedUse:     string
}

export const initialPropertyForm: PropertyFormState = {
  title:              '',
  propertyType:       'Apartment',
  listingType:        'Sale',
  bhk:                2,
  priceInr:           '',
  areaSqft:           '',
  locality:           '',
  city:               '',
  address:            '',
  reraNumber:         '',
  status:             'Ready',
  furnishing:         'Unfurnished',
  description:        '',
  lat:                undefined,
  lng:                undefined,
  securityDeposit:    '',
  availableFrom:      '',
  preferredTenant:    'Any',
  petFriendly:        false,
  maintenanceCharges: '',
  leaseDuration:      '',
  lockInPeriod:       '',
  camCharges:         '',
  plotAllowedUse:     'Any',
}

export function validatePropertyForm(form: PropertyFormState): string | null {
  if (!form.title.trim())    return 'Property title is required.'
  if (!form.priceInr.trim()) return 'Price is required.'
  if (!form.locality.trim()) return 'Locality is required.'
  if (!form.city.trim())     return 'City is required.'
  if (!form.areaSqft.trim()) return 'Area is required.'
  const price = parseInt(form.priceInr)
  if (isNaN(price) || price <= 0) return 'Enter a valid price.'
  const area = parseInt(form.areaSqft)
  if (isNaN(area) || area <= 0)   return 'Enter a valid area.'
  return null
}
```

---

## Task 9 — Create Labour form state

Create file: `packages/logic/src/forms/labour.ts`

```ts
import type { Gender, SkillLevel } from '@carry/shared'

export interface LabourFormState {
  fullName:       string
  age:            string
  gender:         Gender
  skillLevel:     SkillLevel
  skillType:      string
  phone:          string
  minimumWage:    string
  houseNo:        string
  street:         string
  locality:       string
  city:           string
  pincode:        string
}

export const initialLabourForm: LabourFormState = {
  fullName:    '',
  age:         '',
  gender:      'Male',
  skillLevel:  'Skilled',
  skillType:   '',
  phone:       '',
  minimumWage: '',
  houseNo:     '',
  street:      '',
  locality:    '',
  city:        '',
  pincode:     '',
}

export function validateLabourForm(form: LabourFormState): string | null {
  if (!form.fullName.trim()) return 'Full name is required.'
  if (!form.age.trim())      return 'Age is required.'
  if (!form.phone.trim())    return 'Phone number is required.'
  const age = parseInt(form.age)
  if (isNaN(age) || age < 16 || age > 80) return 'Enter a valid age (16–80).'
  if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) return 'Enter a valid 10-digit phone number.'
  return null
}
```

---

## Task 10 — Create Shop form state

Create file: `packages/logic/src/forms/shop.ts`

```ts
export interface ShopFormState {
  shopName:    string
  shopType:    string
  keeperName:  string
  keeperPhone: string
  address:     string
  lat:         number | undefined
  lng:         number | undefined
}

export const initialShopForm: ShopFormState = {
  shopName:    '',
  shopType:    '',
  keeperName:  '',
  keeperPhone: '',
  address:     '',
  lat:         undefined,
  lng:         undefined,
}

export function validateShopForm(form: ShopFormState): string | null {
  if (!form.shopName.trim())    return 'Shop name is required.'
  if (!form.shopType.trim())    return 'Shop type is required.'
  if (!form.keeperName.trim())  return 'Keeper name is required.'
  if (!form.keeperPhone.trim()) return 'Keeper phone is required.'
  if (!/^\d{10}$/.test(form.keeperPhone.replace(/\s/g, ''))) {
    return 'Enter a valid 10-digit phone number.'
  }
  return null
}
```

---

## Task 11 — Create barrel export

Create file: `packages/logic/src/index.ts`

```ts
export * from './adapters'
export * from './lib/uuid'
export * from './lib/price'
export * from './forms/property'
export * from './forms/labour'
export * from './forms/shop'
export * from './hooks/useOfflineList'
export * from './hooks/useFormPersist'
```

---

## Task 12 — Update Web App Imports

Now update the web app to import from `@carry/logic` instead of local files.

### 12a. Update `apps/agent/src/lib/uuid.ts`

Replace the entire file contents with:

```ts
// Re-export from @carry/logic so existing imports still work
export { generateUUID } from '@carry/logic/lib/uuid'
```

### 12b. Update `apps/agent/src/hooks/useOfflineList.ts`

The existing hook in apps/agent directly implements storage. Replace its content with:

```ts
// Web adapter: binds @carry/logic's useOfflineList factory to IndexedDB (localCache)
import { createOfflineListHook, formatCachedAt } from '@carry/logic/hooks/useOfflineList'
import { saveCache, loadCache } from '../lib/localCache'
import type { StorageAdapter } from '@carry/logic'

const indexedDBAdapter: StorageAdapter = {
  save: (key, data, total) => saveCache(key, data as any[], total),
  load: async (key) => {
    const cached = await loadCache(key)
    if (!cached) return null
    return { data: cached.data, total: cached.total, cachedAt: cached.cachedAt }
  },
}

export const useOfflineList = createOfflineListHook(indexedDBAdapter)
export { formatCachedAt }
export type { OfflineListResult } from '@carry/logic/hooks/useOfflineList'
```

### 12c. Update `apps/agent/src/hooks/useFormPersist.ts`

Replace its content with a localStorage adapter:

```ts
// Web adapter: binds @carry/logic's useFormPersist factory to localStorage
import { createFormPersistHook } from '@carry/logic/hooks/useFormPersist'
import type { KVAdapter } from '@carry/logic'

const localStorageAdapter: KVAdapter = {
  get:    (key) => localStorage.getItem(key),
  set:    (key, value) => localStorage.setItem(key, value),
  delete: (key) => localStorage.removeItem(key),
}

export const useFormPersist = createFormPersistHook(localStorageAdapter)
export type { FormPersistResult } from '@carry/logic/hooks/useFormPersist'
```

### 12d. Install `@carry/logic` in the web agent app

```bash
# From repo root
npm install
```

(Workspaces auto-link — no explicit install needed if package.json already lists `@carry/logic`.)

Add `@carry/logic` to `apps/agent/package.json` dependencies:

```json
{
  "dependencies": {
    "@carry/logic": "*"
  }
}
```

---

## Verifier + Decompose Protocol

After completing all 12 tasks:

1. Run `verifier` — it will compile `packages/logic` and `apps/agent` together.
2. If verifier **passes** → immediately read and begin `02_expo_bootstrap.md`.
3. If verifier **fails** → run `decompose` to break down each error, isolate it, and apply the handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report remaining errors to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/02_expo_bootstrap.md` and begin executing it immediately.**
