// Must be the very first import: patches in global.crypto.getRandomValues /
// randomUUID, which Hermes doesn't provide. @carry/logic's generateUUID()
// and Clerk both need it — everything below this line may transitively
// depend on it.
import '../lib/cryptoPolyfill'
import '../global.css'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import { tokenCache } from '../lib/tokenCache'
import { NetworkBanner } from '../components/NetworkBanner'
import { initDatabase } from '../lib/storage'
import { registerBackgroundSync } from '../lib/backgroundSync'
import { persistToken } from '../lib/auth'
import { useOTAUpdate } from '../lib/otaUpdates'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { requestNotificationPermissions } from '../lib/notifications'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter'

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

// Required once, before any OAuth (Google) flow is started, so the browser
// session started by useSSO's startSSOFlow() can hand control back to the app.
WebBrowser.maybeCompleteAuthSession()

// Initialize DB synchronously before any screens mount
initDatabase()

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return
    void WebBrowser.warmUpAsync()
    return () => { void WebBrowser.coolDownAsync() }
  }, [])
}

function AppShell() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { state: updateState, applyUpdate, dismiss: dismissUpdate } = useOTAUpdate()
  useWarmUpBrowser()

  useEffect(() => {
    if (!isSignedIn) return

    // Request notification permissions
    requestNotificationPermissions()

    // Persist JWT to SecureStore for background sync
    const refreshJwt = async () => {
      try {
        const token = await getToken()
        if (token) await persistToken(token)
      } catch {
        // Ignore
      }
    }
    refreshJwt()
    const intervalId = setInterval(refreshJwt, 55 * 60 * 1000)  // Refresh every 55 min

    // Register Android WorkManager background sync
    registerBackgroundSync().catch(console.warn)

    return () => clearInterval(intervalId)
  }, [isSignedIn])

  if (!isLoaded) return null

  return (
    <>
      <NetworkBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="pending-access" />
      </Stack>
      <UpdatePrompt
        state={updateState}
        onUpdate={applyUpdate}
        onDismiss={dismissUpdate}
      />
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  })

  if (!fontsLoaded) return null

  return (
    // @ts-ignore
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <>
        <StatusBar style="dark" />
        <AppShell />
      </>
    </ClerkProvider>
  )
}
