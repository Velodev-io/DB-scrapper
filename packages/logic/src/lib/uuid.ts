/**
 * generateUUID — cross-platform UUID v4.
 *
 * crypto.randomUUID() is a Secure Context-only API (HTTPS / localhost) and
 * isn't implemented by Hermes at all. crypto.getRandomValues is available
 * everywhere that matters — natively in browsers on plain HTTP, and on React
 * Native once the app has imported the 'react-native-get-random-values'
 * polyfill (apps/agent-native/app/_layout.tsx does this first thing) — and
 * gives identical entropy, so it's the fallback rather than Math.random(),
 * which is not collision-resistant enough for IDs used as DB primary keys.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40  // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80  // variant RFC4122
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  // Last-resort fallback — should be unreachable once the polyfill above is installed.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
