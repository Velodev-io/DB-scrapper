import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Carry Admin — Scaffold OK ✓</h1>
      <p>Port 5182</p>
    </div>
  </StrictMode>
)
