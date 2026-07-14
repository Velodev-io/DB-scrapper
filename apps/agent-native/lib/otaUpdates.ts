import * as Updates from 'expo-updates'

/**
 * checkForOTAUpdate — silently checks for and applies JS-only updates.
 * Call on app startup (after auth resolves).
 * Skips in dev mode.
 */
export async function checkForOTAUpdate(): Promise<void> {
  if (__DEV__) return

  try {
    const update = await Updates.checkForUpdateAsync()
    if (!update.isAvailable) return

    await Updates.fetchUpdateAsync()
    // Reload without user prompt — the update is JS-only (no native code changes)
    await Updates.reloadAsync()
  } catch {
    // Silently fail — app continues with current version
  }
}
