import { useState, useEffect } from 'react'

export function NetworkBanner() {
  const [status, setStatus] = useState<'online' | 'offline'>('online')

  useEffect(() => {
    const onOnline  = () => setStatus('online')
    const onOffline = () => setStatus('offline')
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    if (!navigator.onLine) setStatus('offline')
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (status === 'online') return null

  return (
    <div className="network-banner offline" role="alert">
      📵 No signal — changes saved locally and will sync when you reconnect
    </div>
  )
}
