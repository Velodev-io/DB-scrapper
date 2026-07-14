# File 03 — Auth & Navigation

> **Antigravity Instructions:**
> Implement Clerk authentication and the full Expo Router navigation structure. After this file, the app has a working sign-in screen, auth guard, and all bottom tab navigation wired up.

---

## Task 1 — Root Layout with Clerk

Replace `apps/agent-native/app/_layout.tsx` entirely:

```tsx
import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import { tokenCache } from '../lib/tokenCache'
import { NetworkBanner } from '../components/NetworkBanner'
import { initDatabase } from '../lib/storage'
import { registerBackgroundSync } from '../lib/backgroundSync'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter'

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

// Initialize DB synchronously before any screens mount
initDatabase()

function AppShell() {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isSignedIn) {
      registerBackgroundSync().catch(console.warn)
    }
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
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <StatusBar style="dark" backgroundColor="#FDFAF6" />
      <AppShell />
    </ClerkProvider>
  )
}
```

---

## Task 2 — Token Cache (Clerk + SecureStore)

Create file: `apps/agent-native/lib/tokenCache.ts`

```ts
import * as SecureStore from 'expo-secure-store'
import type { TokenCache } from '@clerk/clerk-expo/dist/cache'

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // Ignore
    }
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Ignore
    }
  },
}
```

---

## Task 3 — Auth Guard (index redirect)

Create file: `apps/agent-native/app/index.tsx`

```tsx
import { Redirect } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { View, ActivityIndicator } from 'react-native'
import { colors } from '../theme/colors'

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.ochre} />
      </View>
    )
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />
  }

  const role = user?.publicMetadata?.role as string | undefined
  if (!role || (role !== 'agent' && role !== 'admin')) {
    return <Redirect href="/pending-access" />
  }

  return <Redirect href="/(tabs)/properties" />
}
```

---

## Task 4 — Sign In Screen

Replace `apps/agent-native/app/sign-in.tsx` entirely:

```tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSignIn } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSignIn = async () => {
    if (!isLoaded || loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/')
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: colors.ochre, fontFamily: 'Inter_700Bold' }}>
            Carry
          </Text>
          <Text style={{ fontSize: 14, color: colors.concrete, marginTop: 4 }}>
            Field Operations
          </Text>
        </View>

        <Text style={[typography.pageTitle, { marginBottom: 24 }]}>Sign In</Text>

        {/* Email */}
        <View style={{ marginBottom: 16 }}>
          <Text style={typography.sectionLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={colors.concrete}
            style={{
              borderWidth: 1.5,
              borderColor: colors.sand,
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              color: colors.ink,
              backgroundColor: '#fff',
              marginTop: 4,
            }}
          />
        </View>

        {/* Password */}
        <View style={{ marginBottom: 24 }}>
          <Text style={typography.sectionLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
            placeholderTextColor={colors.concrete}
            style={{
              borderWidth: 1.5,
              borderColor: colors.sand,
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              color: colors.ink,
              backgroundColor: '#fff',
              marginTop: 4,
            }}
          />
        </View>

        {/* Error */}
        {error && (
          <Text style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>
            {error}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          style={{
            backgroundColor: colors.ochre,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign In</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
```

---

## Task 5 — Pending Access Screen

Create file: `apps/agent-native/app/pending-access.tsx`

```tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { colors } from '../theme/colors'

export default function PendingAccessScreen() {
  const { signOut } = useAuth()

  return (
    <View style={{
      flex: 1, backgroundColor: colors.paper,
      alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⏳</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center', marginBottom: 8 }}>
        Access Pending
      </Text>
      <Text style={{ fontSize: 14, color: colors.concrete, textAlign: 'center', lineHeight: 22, marginBottom: 40 }}>
        Your account is awaiting activation. Contact your admin to get your agent role assigned.
      </Text>
      <TouchableOpacity
        onPress={() => signOut()}
        style={{
          borderWidth: 1.5,
          borderColor: colors.concrete,
          borderRadius: 10,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: colors.concrete, fontSize: 14 }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
```

---

## Task 6 — Tab Layout with Bottom Navigation

Replace `apps/agent-native/app/(tabs)/_layout.tsx` entirely:

```tsx
import { Tabs } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { Redirect } from 'expo-router'
import { View, Platform } from 'react-native'
import { colors } from '../../theme/colors'

// Simple SVG-less icon components using text/emoji for now
// Replace with react-native-vector-icons or expo/vector-icons in polish phase
function HouseIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="🏠" focused={focused} /></View>
}
function WorkerIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="👷" focused={focused} /></View>
}
function ShopIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="🏪" focused={focused} /></View>
}
function ProfileIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="👤" focused={focused} /></View>
}

import { Text } from 'react-native'
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
      {emoji}
    </Text>
  )
}

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()

  if (!isLoaded) return null
  if (!isSignedIn) return <Redirect href="/sign-in" />

  const role = user?.publicMetadata?.role as string | undefined
  if (!role || (role !== 'agent' && role !== 'admin')) {
    return <Redirect href="/pending-access" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown:         false,
        tabBarActiveTintColor:   colors.ochre,
        tabBarInactiveTintColor: colors.concrete,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor:  colors.sand,
          borderTopWidth:  1,
          height: Platform.OS === 'android' ? 60 : 80,
          paddingBottom: Platform.OS === 'android' ? 8 : 20,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Properties',
          tabBarIcon: ({ focused }) => <HouseIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="labour"
        options={{
          title: 'Labour',
          tabBarIcon: ({ focused }) => <WorkerIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: 'Shops',
          tabBarIcon: ({ focused }) => <ShopIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tabs>
  )
}
```

---

## Task 7 — Placeholder screens for each tab group

### `apps/agent-native/app/(tabs)/properties/_layout.tsx`

```tsx
import { Stack } from 'expo-router'
export default function PropertiesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

### `apps/agent-native/app/(tabs)/labour/_layout.tsx`

```tsx
import { Stack } from 'expo-router'
export default function LabourLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

### `apps/agent-native/app/(tabs)/shops/_layout.tsx`

```tsx
import { Stack } from 'expo-router'
export default function ShopsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

---

## Task 8 — NetworkBanner Placeholder

Create file: `apps/agent-native/components/NetworkBanner.tsx`

```tsx
// Placeholder — fully implemented in 09_components.md
import { View } from 'react-native'
export function NetworkBanner() {
  return <View />
}
```

---

## Verifier + Decompose Protocol

After completing all tasks:

1. Run `verifier` — confirm auth flow compiles, ClerkProvider renders, tabs resolve.
2. If verifier **passes** → immediately read and begin `04_storage_sync.md`.
3. If verifier **fails** → run `decompose` to isolate each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/04_storage_sync.md` and begin executing it immediately.**
