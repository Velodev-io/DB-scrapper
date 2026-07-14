import * as SecureStore from 'expo-secure-store'

const JWT_KEY        = 'carry_jwt'
const JWT_STORED_AT  = 'carry_jwt_stored_at'
const JWT_EXPIRY_MS  = 55 * 60 * 1000  // 55 minutes

/**
 * persistToken — saves the Clerk JWT to SecureStore so the background runner
 * can access it when the app is closed.
 */
export async function persistToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token)
  await SecureStore.setItemAsync(JWT_STORED_AT, String(Date.now()))
}

/**
 * loadPersistedToken — reads the token from SecureStore.
 * Returns null if expired or missing.
 */
export async function loadPersistedToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(JWT_KEY)
  const storedAt = await SecureStore.getItemAsync(JWT_STORED_AT)
  if (!token || !storedAt) return null
  if (Date.now() - Number(storedAt) > JWT_EXPIRY_MS) return null
  return token
}

export async function clearPersistedToken(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY)
  await SecureStore.deleteItemAsync(JWT_STORED_AT)
}
