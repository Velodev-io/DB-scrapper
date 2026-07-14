import { openDB } from 'idb'

// ── Read-Cache Store ─────────────────────────────────────────────────────────
// Caches API list responses locally so list pages work when offline.
// Data persists until the next successful online fetch overwrites it.
// No time-based expiry — stale data is shown with a notice in the UI.

interface CacheEntry {
  key:      string
  data:     any[]
  total:    number
  cachedAt: number  // Date.now() of last successful API fetch
}

const cacheDbPromise = openDB('carry-read-cache', 1, {
  upgrade(db) {
    db.createObjectStore('read-cache', { keyPath: 'key' })
  },
})

export async function saveCache(key: string, data: any[], total: number): Promise<void> {
  const db = await cacheDbPromise
  const entry: CacheEntry = { key, data, total, cachedAt: Date.now() }
  await db.put('read-cache', entry)
}

export async function loadCache(key: string): Promise<{ data: any[], total: number, cachedAt: number } | null> {
  const db = await cacheDbPromise
  const entry = await db.get('read-cache', key) as CacheEntry | undefined
  if (!entry) return null
  return { data: entry.data, total: entry.total, cachedAt: entry.cachedAt }
}

export async function clearAllCache(): Promise<void> {
  const db = await cacheDbPromise
  await db.clear('read-cache')
}
