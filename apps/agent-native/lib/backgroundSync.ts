import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { notifySyncComplete, notifySyncFailed, refreshBadge } from './notifications'
import { loadPersistedToken } from './auth'
import { runFullSync } from './sync'
import { getPendingCount } from './uploadQueue'

export const SYNC_TASK_NAME = 'carry-background-sync'

/**
 * Define the background task.
 * This runs in a lightweight JS context — no React, no DOM.
 * Uses SQLite directly and SecureStore for auth.
 *
 * stopOnTerminate: false  → keeps running after app is force-killed
 * startOnBoot: true       → Android WorkManager re-registers after reboot
 */
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const token = await loadPersistedToken()
    if (!token) {
      // Token expired or not set — skip silently
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    await runFullSync(token)

    const remaining = getPendingCount()
    await refreshBadge(remaining)

    if (remaining === 0) {
      await notifySyncComplete(0)
    } else {
      await notifySyncFailed(remaining)
    }

    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

/**
 * registerBackgroundSync — call once after user signs in.
 * Safe to call multiple times — Expo deduplicates.
 */
export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync()

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn('Background fetch is restricted or denied on this device.')
    return
  }

  await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval:  60 * 15,  // 15 minutes minimum (Android may batch)
    stopOnTerminate:  false,    // ← KEY: runs even after app is force-killed
    startOnBoot:      true,     // ← KEY: re-registers after phone reboot
  })
}

export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME)
  } catch {
    // Not registered — ignore
  }
}
