/**
 * generateUUID — cross-platform UUID v4.
 *
 * crypto.randomUUID() is a Secure Context-only API (HTTPS / localhost) and
 * isn't implemented by Hermes at all. On React Native, apps/agent-native's
 * lib/cryptoPolyfill.ts (imported first thing in app/_layout.tsx) patches
 * both crypto.randomUUID and crypto.getRandomValues onto the global object
 * using expo-crypto, so this file stays platform-agnostic and just uses
 * whichever the environment provides. The getRandomValues path is real
 * CSPRNG entropy either way (native browser API or expo-crypto) — Math.random()
 * is only a last resort, since it's not collision-resistant enough for IDs
 * used as DB primary keys.
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
