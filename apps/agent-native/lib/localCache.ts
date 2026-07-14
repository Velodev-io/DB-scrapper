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
