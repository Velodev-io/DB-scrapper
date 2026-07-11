import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushUploadQueueForeground } from './lib/uploadQueue.js'

// Register Service Worker for background sync (standard Web)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}

// Foreground fallback (critical for iOS PWAs and Capacitor WebViews)
window.addEventListener('load', () => {
  flushUploadQueueForeground().catch(console.error)
})

window.addEventListener('online', () => {
  flushUploadQueueForeground().catch(console.error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Carry Field Agent — Scaffold OK ✓</h1>
      <p>Port 5181</p>
    </div>
  </StrictMode>
)
