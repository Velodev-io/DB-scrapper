import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { clerkAppearance } from '@carry/shared'
import { flushUploadQueueForeground, flushPendingRecordsForeground } from './lib/uploadQueue'

import './index.css'
import App from './App'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!publishableKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}

// Foreground fallback (critical for iOS PWAs where background sync is unavailable)
window.addEventListener('load', () => {
  flushUploadQueueForeground().catch(console.error)
  flushPendingRecordsForeground().catch(console.error)
})

window.addEventListener('online', () => {
  flushUploadQueueForeground().catch(console.error)
  flushPendingRecordsForeground().catch(console.error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
