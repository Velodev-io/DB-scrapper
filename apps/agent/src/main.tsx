import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Carry Field Agent — Scaffold OK ✓</h1>
      <p>Port 5181</p>
    </div>
  </StrictMode>
)
