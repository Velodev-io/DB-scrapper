import * as Device from 'expo-device'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

// Check if we are running in Expo Go on Android (where remote push notifications native module is unsupported/removed)
const isAndroidExpoGo = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient

// expo-notifications throws at *import time* when running inside Expo Go on
// Android (SDK 53+ removed that native module entirely) — a runtime
// isAndroidExpoGo check can't prevent that, since the throw happens before
// any of our code runs. It must never be statically imported; loaded lazily
// here, and only outside Expo Go, so the module's top-level code never
// executes in the environment that throws.
type NotificationsModule = typeof import('expo-notifications')
let notificationsPromise: Promise<NotificationsModule | null> | null = null

function getNotifications(): Promise<NotificationsModule | null> {
  if (isAndroidExpoGo) return Promise.resolve(null)
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').then(Notifications => {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge:  true,
            shouldShowBanner: true,
            shouldShowList:   true,
          }),
        })
      } catch (e) {
        console.warn('Failed to set notification handler', e)
      }
      return Notifications
    })
  }
  return notificationsPromise
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Emulator — skip
    return false
  }

  const Notifications = await getNotifications()
  if (!Notifications) return false

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    if (existingStatus === 'granted') return true

    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch {
    return false
  }
}

export async function notifySyncComplete(count: number): Promise<void> {
  const Notifications = await getNotifications()
  if (!Notifications) return
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Carry — All Synced',
        body:  count > 0
          ? `${count} record${count > 1 ? 's' : ''} submitted successfully.`
          : 'All your records are up to date.',
      },
      trigger: null,  // Show immediately
    })
  } catch {
    // Ignore
  }
}

export async function notifySyncFailed(count: number): Promise<void> {
  const Notifications = await getNotifications()
  if (!Notifications) return
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Carry — Sync Pending',
        body:  `${count} record${count > 1 ? 's' : ''} still waiting. Open the app to retry.`,
      },
      trigger: null,
    })
  } catch {
    // Ignore
  }
}

export async function refreshBadge(count: number): Promise<void> {
  const Notifications = await getNotifications()
  if (!Notifications) return
  try {
    await Notifications.setBadgeCountAsync(count)
  } catch {
    // Ignore on unsupported platforms
  }
}

