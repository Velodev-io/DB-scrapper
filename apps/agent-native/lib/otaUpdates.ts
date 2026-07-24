import * as Updates from 'expo-updates'
import { useState, useEffect, useCallback } from 'react'

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; message: string }
  | { status: 'downloading' }
  | { status: 'ready' }
  | { status: 'error'; message: string }

/**
 * useOTAUpdate — hook that checks for updates and exposes state + actions.
 * Shows an in-app prompt when an update is available instead of silently reloading.
 */
export function useOTAUpdate() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  const check = useCallback(async () => {
    if (__DEV__) return
    setState({ status: 'checking' })
    try {
      const result = await Updates.checkForUpdateAsync()
      if (!result.isAvailable) {
        setState({ status: 'idle' })
        return
      }
      // Pull the update message from the manifest if available
      const manifest = result.manifest as Record<string, unknown> | undefined
      const message =
        (manifest?.extra as Record<string, unknown> | undefined)?.updateMessage as string
        ?? 'A new version is ready with improvements and bug fixes.'
      setState({ status: 'available', message })
    } catch (err) {
      setState({ status: 'idle' }) // silently swallow — don't disrupt users
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    setState({ status: 'downloading' })
    try {
      await Updates.fetchUpdateAsync()
      setState({ status: 'ready' })
      // Small delay so "ready" state renders before the reload
      setTimeout(() => Updates.reloadAsync(), 600)
    } catch {
      setState({ status: 'error', message: 'Download failed. Please try again later.' })
    }
  }, [])

  const dismiss = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  // Check on mount (after component mounts in production)
  useEffect(() => {
    check()
  }, [check])

  return { state, applyUpdate, dismiss }
}

/**
 * checkForOTAUpdate — kept for backwards compatibility if called directly.
 * Prefer useOTAUpdate() hook in components.
 */
export async function checkForOTAUpdate(): Promise<void> {
  if (__DEV__) return
  try {
    const update = await Updates.checkForUpdateAsync()
    if (!update.isAvailable) return
    await Updates.fetchUpdateAsync()
    await Updates.reloadAsync()
  } catch {
    // Silently fail
  }
}
