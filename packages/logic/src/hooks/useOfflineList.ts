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
      let hasCachedData = false

      // Step 1: Serve from cache immediately for instant display
      try {
        const cached = await storage.load(cacheKey)
        if (cached) {
          setData(cached.data as T[])
          setTotal(cached.total)
          setCachedAt(cached.cachedAt)
          setFromCache(true)
          setLoading(false)
          hasCachedData = true
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
        // Don't surface a network error when cached data is already on
        // screen — it'd read as "this list is broken" when it's really just
        // stale. Callers relying on `fromCache` can still tell the two apart.
        if (!hasCachedData) {
          const msg = err instanceof Error ? err.message : 'Failed to load data'
          setError(msg)
        }
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
