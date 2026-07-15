import * as ExpoCrypto from 'expo-crypto'

// Hermes doesn't provide a Web Crypto global at all. expo-crypto ships as
// part of the Expo SDK — unlike a bare native module, it's bundled inside
// Expo Go too, so this works without a custom dev client. Its
// getRandomValues/randomUUID match the Web Crypto API signatures exactly,
// so @carry/logic's generateUUID() (crypto.randomUUID -> crypto.getRandomValues
// -> Math.random) picks up real entropy on-device with no platform branch
// needed there.
const g = globalThis as { crypto?: Partial<Crypto> }

if (!g.crypto) g.crypto = {}
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = ExpoCrypto.getRandomValues as typeof crypto.getRandomValues
}
if (typeof g.crypto.randomUUID !== 'function') {
  g.crypto.randomUUID = ExpoCrypto.randomUUID as typeof crypto.randomUUID
}
