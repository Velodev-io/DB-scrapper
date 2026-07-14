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
