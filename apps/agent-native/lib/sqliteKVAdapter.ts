import type { KVAdapter } from '@carry/logic'
import { db } from './storage'

export const sqliteKVAdapter: KVAdapter = {
  get: (key: string) => {
    try {
      const row = db.getFirstSync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [key])
      return row ? row.value : null
    } catch {
      return null
    }
  },
  set: (key: string, value: string) => {
    try {
      db.runSync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value])
    } catch (e) {
      console.warn('Failed to set KV value in SQLite', e)
    }
  },
  delete: (key: string) => {
    try {
      db.runSync('DELETE FROM kv_store WHERE key = ?', [key])
    } catch (e) {
      console.warn('Failed to delete KV value in SQLite', e)
    }
  }
}
