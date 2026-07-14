import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

// Check if we are running in Expo Go on Android (where remote push notifications native module is unsupported/removed)
const isAndroidExpoGo = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient

// Configure how notifications appear when app is in foreground
if (!isAndroidExpoGo) {
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
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isAndroidExpoGo) return false
  if (!Device.isDevice) {
    // Emulator — skip
    return false
  }

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
  if (isAndroidExpoGo) return
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
  if (isAndroidExpoGo) return
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
  if (isAndroidExpoGo) return
  try {
    await Notifications.setBadgeCountAsync(count)
  } catch {
    // Ignore on unsupported platforms
  }
}

