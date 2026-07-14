# File 04 — Native Storage & Background Sync

> **Antigravity Instructions:**
> Implement the full offline-first storage layer using expo-sqlite and the complete background sync using expo-background-fetch (Android WorkManager). This is the core of what makes the native app superior to the Capacitor web approach.

---

## Task 1 — Initialize expo-sqlite Database

Create file: `apps/agent-native/lib/storage.ts`

```ts
import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabaseSync('carry.db')

/**
 * initDatabase — run on app startup (in _layout.tsx).
 * Creates all tables with IF NOT EXISTS — safe to call on every launch.
 */
export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS read_cache (
      key       TEXT    PRIMARY KEY,
      data      TEXT    NOT NULL,
      total     INTEGER NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_uploads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id   TEXT    NOT NULL UNIQUE,
      model      TEXT    NOT NULL,
      record_id  TEXT    NOT NULL,
      field_name TEXT    NOT NULL,
      file_uri   TEXT    NOT NULL,
      file_name  TEXT    NOT NULL,
      folder     TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      attempts   INTEGER NOT NULL DEFAULT 0,
      public_id  TEXT                          -- set after successful Cloudinary upload
    );

    CREATE TABLE IF NOT EXISTS pending_records (
      id         TEXT    PRIMARY KEY,
      type       TEXT    NOT NULL,
      payload    TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `)
}

export { db }
```

---

## Task 2 — Read Cache (StorageAdapter implementation)

Create file: `apps/agent-native/lib/localCache.ts`

```ts
import { db } from './storage'
import type { StorageAdapter } from '@carry/logic'

export const sqliteStorageAdapter: StorageAdapter = {
  async save(key: string, data: unknown[], total: number): Promise<void> {
    db.runSync(
      `INSERT OR REPLACE INTO read_cache (key, data, total, cached_at)
       VALUES (?, ?, ?, ?)`,
      [key, JSON.stringify(data), total, Date.now()]
    )
  },

  async load(key: string): Promise<{ data: unknown[]; total: number; cachedAt: number } | null> {
    const row = db.getFirstSync<{
      data: string; total: number; cached_at: number
    }>(
      `SELECT data, total, cached_at FROM read_cache WHERE key = ?`,
      [key]
    )
    if (!row) return null
    return {
      data:     JSON.parse(row.data),
      total:    row.total,
      cachedAt: row.cached_at,
    }
  },
}

export function clearReadCache(key: string): void {
  db.runSync(`DELETE FROM read_cache WHERE key = ?`, [key])
}

export function clearAllReadCache(): void {
  db.runSync(`DELETE FROM read_cache`)
}
```

---

## Task 3 — MMKV Adapter (form draft persistence)

Create file: `apps/agent-native/lib/mmkvAdapter.ts`

```ts
import { MMKV } from 'react-native-mmkv'
import type { KVAdapter } from '@carry/logic'

const storage = new MMKV({ id: 'carry-form-drafts' })

export const mmkvAdapter: KVAdapter = {
  get:    (key: string) => storage.getString(key) ?? null,
  set:    (key: string, value: string) => storage.set(key, value),
  delete: (key: string) => storage.delete(key),
}
```

---

## Task 4 — Upload Queue (Native)

Create file: `apps/agent-native/lib/uploadQueue.ts`

```ts
import { db } from './storage'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PendingUpload {
  id:        number
  localId:   string
  model:     string
  recordId:  string
  fieldName: string
  fileUri:   string    // local file:// URI on device
  fileName:  string
  folder:    string
  attempts:  number
  publicId:  string | null
}

export interface PendingRecord {
  id:        string
  type:      'property' | 'labour' | 'shop'
  payload:   Record<string, unknown>
  createdAt: number
}

// ── Upload Queue ─────────────────────────────────────────────────────────────

export function enqueueUpload(upload: Omit<PendingUpload, 'id' | 'attempts' | 'publicId'>): void {
  db.runSync(
    `INSERT OR IGNORE INTO pending_uploads
     (local_id, model, record_id, field_name, file_uri, file_name, folder)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [upload.localId, upload.model, upload.recordId, upload.fieldName,
     upload.fileUri, upload.fileName, upload.folder]
  )
}

export function getPendingUploads(): PendingUpload[] {
  return db.getAllSync<PendingUpload>(
    `SELECT id, local_id as localId, model, record_id as recordId,
            field_name as fieldName, file_uri as fileUri, file_name as fileName,
            folder, attempts, public_id as publicId
     FROM pending_uploads
     WHERE public_id IS NULL
     ORDER BY created_at ASC`
  )
}

export function markUploadComplete(localId: string, publicId: string): void {
  db.runSync(
    `UPDATE pending_uploads SET public_id = ? WHERE local_id = ?`,
    [publicId, localId]
  )
}

export function incrementUploadAttempts(id: number): void {
  db.runSync(`UPDATE pending_uploads SET attempts = attempts + 1 WHERE id = ?`, [id])
}

export function deleteUpload(localId: string): void {
  db.runSync(`DELETE FROM pending_uploads WHERE local_id = ?`, [localId])
}

// ── Pending Records ───────────────────────────────────────────────────────────

export function enqueuePendingRecord(record: PendingRecord): void {
  db.runSync(
    `INSERT OR IGNORE INTO pending_records (id, type, payload, created_at)
     VALUES (?, ?, ?, ?)`,
    [record.id, record.type, JSON.stringify(record.payload), record.createdAt]
  )
}

export function getPendingRecords(): PendingRecord[] {
  return db.getAllSync<{ id: string; type: string; payload: string; created_at: number }>(
    `SELECT id, type, payload, created_at FROM pending_records ORDER BY created_at ASC`
  ).map(row => ({
    id:        row.id,
    type:      row.type as PendingRecord['type'],
    payload:   JSON.parse(row.payload),
    createdAt: row.created_at,
  }))
}

export function deletePendingRecord(id: string): void {
  db.runSync(`DELETE FROM pending_records WHERE id = ?`, [id])
}

export function getPendingCount(): number {
  const uploads = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_uploads WHERE public_id IS NULL`
  )
  const records = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_records`
  )
  return (uploads?.count ?? 0) + (records?.count ?? 0)
}
```

---

## Task 5 — JWT Storage for Background Runner

Create file: `apps/agent-native/lib/auth.ts`

```ts
import * as SecureStore from 'expo-secure-store'

const JWT_KEY        = 'carry_jwt'
const JWT_STORED_AT  = 'carry_jwt_stored_at'
const JWT_EXPIRY_MS  = 55 * 60 * 1000  // 55 minutes

/**
 * persistToken — saves the Clerk JWT to SecureStore so the background runner
 * can access it when the app is closed.
 */
export async function persistToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token)
  await SecureStore.setItemAsync(JWT_STORED_AT, String(Date.now()))
}

/**
 * loadPersistedToken — reads the token from SecureStore.
 * Returns null if expired or missing.
 */
export async function loadPersistedToken(): Promise<string | null> {
  try {
    const token    = await SecureStore.getItemAsync(JWT_KEY)
    const storedAt = await SecureStore.getItemAsync(JWT_STORED_AT)
    if (!token || !storedAt) return null
    if (Date.now() - parseInt(storedAt) > JWT_EXPIRY_MS) return null
    return token
  } catch {
    return null
  }
}

export async function clearPersistedToken(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY)
  await SecureStore.deleteItemAsync(JWT_STORED_AT)
}
```

---

## Task 6 — Cloudinary Upload Function

Create file: `apps/agent-native/lib/cloudinaryUpload.ts`

```ts
import { api } from '@carry/shared'
import type { CloudinarySignature } from '@carry/shared'

/**
 * uploadFileToCloudinary — uploads a local file URI to Cloudinary.
 * Works identically in React Native since FormData + fetch are available.
 */
export async function uploadFileToCloudinary(
  fileUri:   string,
  fileName:  string,
  folder:    string,
  token:     string,
): Promise<string> {
  // 1. Get a signed upload URL from our API
  const sig = await api.get<CloudinarySignature>(
    `/uploads/sign?folder=${encodeURIComponent(folder)}`,
    token
  )

  // 2. Build multipart form — React Native FormData handles file:// URIs natively
  const form = new FormData()
  form.append('file', {
    uri:  fileUri,
    type: 'image/jpeg',
    name: fileName,
  } as any)
  form.append('signature',  sig.signature)
  form.append('timestamp',  String(sig.timestamp))
  form.append('api_key',    sig.apiKey)
  form.append('folder',     sig.folder)

  // 3. Upload to Cloudinary
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: 'POST', body: form }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Cloudinary upload failed: ${res.status} — ${body}`)
  }

  const data = await res.json()
  return data.public_id as string
}
```

---

## Task 7 — Foreground Flush Functions

Create file: `apps/agent-native/lib/sync.ts`

```ts
import { api } from '@carry/shared'
import {
  getPendingUploads, markUploadComplete, incrementUploadAttempts, deleteUpload,
  getPendingRecords, deletePendingRecord,
} from './uploadQueue'
import { uploadFileToCloudinary } from './cloudinaryUpload'

const MAX_ATTEMPTS = 5
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:4001/api/v1'

// ── Flush photo uploads ───────────────────────────────────────────────────────

export async function flushPendingUploads(token: string): Promise<void> {
  const pending = getPendingUploads()

  for (const upload of pending) {
    if (upload.attempts >= MAX_ATTEMPTS) continue
    // Skip temp-record uploads — those are handled in flushPendingRecords
    if (upload.recordId.startsWith('temp-')) continue

    try {
      const publicId = await uploadFileToCloudinary(
        upload.fileUri, upload.fileName, upload.folder, token
      )
      // Patch the real DB record to update the publicId
      await api.patch(
        `/uploads/patch-queued`,
        {
          model:     upload.model,
          recordId:  upload.recordId,
          fieldName: upload.fieldName,
          publicId,
        },
        token
      )
      markUploadComplete(upload.localId, publicId)
    } catch {
      incrementUploadAttempts(upload.id)
    }
  }
}

// ── Flush pending records ─────────────────────────────────────────────────────

export async function flushPendingRecords(token: string): Promise<void> {
  const pendingUploads = getPendingUploads()
  const pendingRecords = getPendingRecords()

  // Step 1: Upload photo files for temp records first
  for (const upload of pendingUploads) {
    if (!upload.recordId.startsWith('temp-')) continue
    if (upload.publicId || upload.attempts >= MAX_ATTEMPTS) continue

    try {
      const publicId = await uploadFileToCloudinary(
        upload.fileUri, upload.fileName, upload.folder, token
      )
      markUploadComplete(upload.localId, publicId)
    } catch {
      incrementUploadAttempts(upload.id)
    }
  }

  // Step 2: Submit records whose photos are all uploaded
  const freshUploads = getPendingUploads()

  for (const record of pendingRecords) {
    try {
      const payload = { ...record.payload }
      let allReady = true

      // Resolve __queued__: localIds → real Cloudinary publicIds
      const resolveId = (localId: string): string | null => {
        const cleanId = String(localId).replace('__queued__:', '')
        const u = freshUploads.find(u => u.localId === cleanId)
        return u?.publicId ?? null
      }

      if (record.type === 'property') {
        const images: string[] = []
        for (const id of (payload.images as string[] ?? [])) {
          const resolved = resolveId(id)
          if (!resolved) { allReady = false; break }
          images.push(resolved)
        }
        if (!allReady) continue
        payload.images = images

        if (payload.floorPlanUrl && String(payload.floorPlanUrl).startsWith('__queued__:')) {
          const resolved = resolveId(String(payload.floorPlanUrl))
          if (!resolved) continue
          payload.floorPlanUrl = resolved
        }
      }

      if (record.type === 'labour' && payload.profilePhotoUrl) {
        if (String(payload.profilePhotoUrl).startsWith('__queued__:')) {
          const resolved = resolveId(String(payload.profilePhotoUrl))
          if (!resolved) continue
          payload.profilePhotoUrl = resolved
        }
      }

      if (record.type === 'shop') {
        const images: string[] = []
        for (const id of (payload.images as string[] ?? [])) {
          const resolved = resolveId(id)
          if (!resolved) { allReady = false; break }
          images.push(resolved)
        }
        if (!allReady) continue
        payload.images = images
      }

      const endpoint = record.type === 'property' ? '/properties'
                     : record.type === 'shop'     ? '/shops'
                     : '/labour'

      await api.post(`${BASE_URL}${endpoint}`, payload, token)

      // Clean up associated uploads
      const localIds = [
        ...(record.payload.images as string[] ?? []),
        record.payload.floorPlanUrl as string,
        record.payload.profilePhotoUrl as string,
      ].filter(Boolean)

      for (const localId of localIds) {
        if (String(localId).startsWith('__queued__:')) {
          deleteUpload(String(localId).replace('__queued__:', ''))
        }
      }

      deletePendingRecord(record.id)
    } catch {
      // Will retry next sync cycle
    }
  }
}

// ── Full sync (used by both foreground + background runner) ───────────────────

export async function runFullSync(token: string): Promise<void> {
  await flushPendingUploads(token)
  await flushPendingRecords(token)
}
```

---

## Task 8 — Background Sync Registration

Create file: `apps/agent-native/lib/backgroundSync.ts`

```ts
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import { loadPersistedToken } from './auth'
import { runFullSync } from './sync'
import { getPendingCount } from './uploadQueue'

export const SYNC_TASK_NAME = 'carry-background-sync'

/**
 * Define the background task.
 * This runs in a lightweight JS context — no React, no DOM.
 * Uses SQLite directly and SecureStore for auth.
 *
 * stopOnTerminate: false  → keeps running after app is force-killed
 * startOnBoot: true       → Android WorkManager re-registers after reboot
 */
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const token = await loadPersistedToken()
    if (!token) {
      // Token expired or not set — skip silently
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    await runFullSync(token)

    const remaining = getPendingCount()

    if (remaining === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Carry — All Synced',
          body:  'All your records have been submitted successfully.',
        },
        trigger: null,
      })
    } else {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Carry — Sync Incomplete',
          body:  `${remaining} item${remaining > 1 ? 's' : ''} still pending. Open the app to retry.`,
        },
        trigger: null,
      })
    }

    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

/**
 * registerBackgroundSync — call once after user signs in.
 * Safe to call multiple times — Expo deduplicates.
 */
export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync()

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn('Background fetch is restricted or denied on this device.')
    return
  }

  await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval:  60 * 15,  // 15 minutes minimum (Android may batch)
    stopOnTerminate:  false,    // ← KEY: runs even after app is force-killed
    startOnBoot:      true,     // ← KEY: re-registers after phone reboot
  })
}

export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME)
  } catch {
    // Not registered — ignore
  }
}
```

---

## Task 9 — Wire Token Persistence to App.tsx

Update `apps/agent-native/app/_layout.tsx` — add JWT persistence on auth state:

Find the `AppShell` function and update the `useEffect`:

```tsx
import { useAuth, useUser } from '@clerk/clerk-expo'
import { persistToken } from '../lib/auth'
import { registerBackgroundSync } from '../lib/backgroundSync'

// Inside AppShell component:
useEffect(() => {
  if (!isSignedIn) return

  // Persist JWT to SecureStore for background sync
  const refreshJwt = async () => {
    try {
      const token = await getToken()
      if (token) await persistToken(token)
    } catch {
      // Ignore
    }
  }
  refreshJwt()
  const intervalId = setInterval(refreshJwt, 55 * 60 * 1000)  // Refresh every 55 min

  // Register Android WorkManager background sync
  registerBackgroundSync().catch(console.warn)

  return () => clearInterval(intervalId)
}, [isSignedIn])
```

> **Note:** Import `useAuth` with the `getToken` method and wire it to `refreshJwt`. The `getToken` call must be inside the component that has access to ClerkProvider context.

---

## Task 10 — useOfflineList and useFormPersist (Native bindings)

Create file: `apps/agent-native/hooks/useOfflineList.ts`

```ts
import { createOfflineListHook, formatCachedAt } from '@carry/logic'
import { sqliteStorageAdapter } from '../lib/localCache'

export const useOfflineList = createOfflineListHook(sqliteStorageAdapter)
export { formatCachedAt }
```

Create file: `apps/agent-native/hooks/useFormPersist.ts`

```ts
import { createFormPersistHook } from '@carry/logic'
import { mmkvAdapter } from '../lib/mmkvAdapter'

export const useFormPersist = createFormPersistHook(mmkvAdapter)
```

---

## Verifier + Decompose Protocol

After completing all tasks:

1. Run `verifier` — confirm expo-sqlite schema compiles, upload queue functions are typed correctly, background task registers without error.
2. If verifier **passes** → immediately read and begin `05_photo_upload.md`.
3. If verifier **fails** → run `decompose` to isolate and fix each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/05_photo_upload.md` and begin executing it immediately.**
