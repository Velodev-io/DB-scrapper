import { useState, useEffect, useCallback, useRef } from 'react'
import { saveCache, loadCache } from '../lib/localCache'

// ── useOfflineList ────────────────────────────────────────────────────────────
// Offline-aware data fetching hook for list pages.
//
// Strategy:
//   1. Load IDB cache immediately → instant display (no loading flash for returning users)
//   2. Attempt the API fetch in parallel
//   3. Success → update IDB cache + UI, clear fromCache flag
//   4. Failure (offline / timeout) → keep IDB data, set fromCache = true
//
// Cache persists indefinitely — overwritten only by the next successful fetch.

export interface OfflineListResult<T> {
  data:         T[]
  total:        number
  loading:      boolean
  error:        string | null
  fromCache:    boolean       // true = offline, showing stale data
  cachedAt:     number | null // timestamp of last successful API sync
  refetch:      () => void
}

export function useOfflineList<T>(
  cacheKey:  string,
  fetcher:   () => Promise<{ data: T[], total: number }>
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

    // Step 1: Serve from IDB cache immediately for instant display
    try {
      const cached = await loadCache(cacheKey)
      if (cached) {
        setData(cached.data as T[])
        setTotal(cached.total)
        setCachedAt(cached.cachedAt)
        setFromCache(true)
        setLoading(false)  // Show cached data right away; don't wait for network
      }
    } catch {
      // IDB unavailable — proceed to network fetch
    }

    // Step 2: Try the network
    try {
      const res = await fetcherRef.current()
      setData(res.data)
      setTotal(res.total)
      setFromCache(false)
      setError(null)
      const now = Date.now()
      setCachedAt(now)
      // Update IDB cache with fresh data
      await saveCache(cacheKey, res.data, res.total)
    } catch (err: any) {
      // Network failed — keep whatever we loaded from IDB
      // Only show error if we have nothing from cache
      setError(prev => (data.length === 0 ? (err?.message || 'Failed to load data') : prev))
    } finally {
      setLoading(false)
    }
  }, [cacheKey])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { data, total, loading, error, fromCache, cachedAt, refetch: load }
}

// ── Stale banner formatting helper ───────────────────────────────────────────
export function formatCachedAt(cachedAt: number): string {
  const now  = Date.now()
  const diff = now - cachedAt
  const mins = Math.floor(diff / 60_000)
  const hrs  = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins} min ago`
  if (hrs  < 24)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}
