import { useState, useEffect, useCallback } from 'react'
import {
  flushUploadQueueForeground,
  flushPendingRecordsForeground,
  refreshBadge,
} from '../lib/uploadQueue'

type BannerStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'partial'

export function NetworkBanner() {
  const [status, setStatus] = useState<BannerStatus>('online')

  const runSync = useCallback(async () => {
    setStatus('syncing')
    try {
      await flushUploadQueueForeground()
      await flushPendingRecordsForeground()
      await refreshBadge()
      setStatus('synced')
      // Auto-dismiss "All synced" after 3 seconds
      setTimeout(() => setStatus('online'), 3000)
    } catch {
      setStatus('partial')
      setTimeout(() => setStatus('online'), 4000)
    }
  }, [])

  useEffect(() => {
    const onOnline = () => {
      // Trigger full sync as soon as connectivity returns
      runSync()
    }
    const onOffline = () => setStatus('offline')

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // Also sync when the tab becomes visible again (app brought to foreground)
    const onVisible = () => {
      if (navigator.onLine) runSync()
    }
    document.addEventListener('visibilitychange', onVisible)

    if (!navigator.onLine) setStatus('offline')

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [runSync])

  if (status === 'online') return null

  const styles: Record<BannerStatus, React.CSSProperties> = {
    online:  {},
    offline: { background: '#3a2a1a', color: '#f5c07a', borderBottom: '1px solid #7a4a10' },
    syncing: { background: '#1a2a3a', color: '#7ab8f5', borderBottom: '1px solid #0a4a8a' },
    synced:  { background: '#1a3a2a', color: '#7af5b8', borderBottom: '1px solid #0a8a4a' },
    partial: { background: '#3a2a1a', color: '#f5c07a', borderBottom: '1px solid #7a4a10' },
  }

  const messages: Record<BannerStatus, string> = {
    online:  '',
    offline: '📵  No signal — changes saved locally, will sync when reconnected',
    syncing: '⏳  Syncing…',
    synced:  '✅  All synced',
    partial: '⚠️  Some items still pending — will retry automatically',
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0.5rem 1rem',
        fontSize: '0.78rem',
        fontWeight: 500,
        textAlign: 'center',
        transition: 'background 0.3s',
        ...styles[status],
      }}
    >
      {status === 'syncing' && (
        <span style={{
          display: 'inline-block',
          width: 10, height: 10,
          border: '2px solid rgba(122,184,245,0.4)',
          borderTopColor: '#7ab8f5',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          marginRight: '0.4rem',
          verticalAlign: 'middle',
        }} />
      )}
      {messages[status]}
    </div>
  )
}
