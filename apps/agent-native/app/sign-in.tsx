import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo'
import * as AuthSession from 'expo-auth-session'
import { useRouter } from 'expo-router'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'

type Mode = 'sign-in' | 'sign-up' | 'verify'

// This must exactly match an allowed redirect URL in Clerk. Defining it
// explicitly keeps the callback stable in an installed Android build instead
// of relying on Expo's environment-specific default URI.
const GOOGLE_REDIRECT_URL = AuthSession.makeRedirectUri({
  scheme: 'carry',
  path: 'oauth',
})

const inputStyle = {
  borderWidth: 1.5,
  borderColor: colors.sand,
  borderRadius: 10,
  padding: 14,
  fontSize: 15,
  color: colors.ink,
  backgroundColor: '#fff',
  marginTop: 4,
} as const

export default function SignInScreen() {
  const { signIn, setActive: setActiveFromSignIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, setActive: setActiveFromSignUp, isLoaded: signUpLoaded } = useSignUp()
  const { startSSOFlow } = useSSO()
  const router = useRouter()

  const [mode,     setMode]     = useState<Mode>('sign-in')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleAuth = async () => {
    if (googleLoading) return
    setError(null)
    setGoogleLoading(true)
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy:    'oauth_google',
        redirectUrl: GOOGLE_REDIRECT_URL,
      })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        router.replace('/')
      }
      // If createdSessionId is missing, Clerk needs another step (e.g. MFA) —
      // not handled here since this app doesn't enable that.
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!signInLoaded || loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActiveFromSignIn({ session: result.createdSessionId })
        router.replace('/')
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!signUpLoaded || loading) return
    setError(null)
    setLoading(true)
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setMode('verify')
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!signUpLoaded || loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActiveFromSignUp({ session: result.createdSessionId })
        router.replace('/')
      } else {
        setError('Verification incomplete. Please check the code and try again.')
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Verification failed. Please try again.')
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

        {mode === 'verify' ? (
          <>
            <Text style={[typography.pageTitle, { marginBottom: 8 }]}>Check your email</Text>
            <Text style={{ fontSize: 13, color: colors.concrete, marginBottom: 24, lineHeight: 20 }}>
              We sent a verification code to {email}. Enter it below to finish creating your account.
            </Text>

            <View style={{ marginBottom: 24 }}>
              <Text style={typography.sectionLabel}>Verification Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor={colors.concrete}
                style={inputStyle}
              />
            </View>

            {error && (
              <Text style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>{error}</Text>
            )}

            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading}
              style={{ backgroundColor: colors.ochre, borderRadius: 12, padding: 16, alignItems: 'center' }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Verify & Continue</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode('sign-up')} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.concrete, fontSize: 13 }}>Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[typography.pageTitle, { marginBottom: 24 }]}>
              {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </Text>

            {/* Google */}
            <TouchableOpacity
              onPress={handleGoogleAuth}
              disabled={googleLoading}
              style={{
                borderWidth: 1.5, borderColor: colors.sand, borderRadius: 12,
                padding: 14, alignItems: 'center', backgroundColor: '#fff', marginBottom: 20,
                flexDirection: 'row', justifyContent: 'center', gap: 10,
              }}
            >
              {googleLoading
                ? <ActivityIndicator color={colors.ink} />
                : (
                  <>
                    <Text style={{ fontSize: 16 }}>G</Text>
                    <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>
                      Continue with Google
                    </Text>
                  </>
                )
              }
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.sand }} />
              <Text style={{ color: colors.concrete, fontSize: 12, marginHorizontal: 10 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.sand }} />
            </View>

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
                style={inputStyle}
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
                autoComplete={mode === 'sign-up' ? 'new-password' : 'password'}
                placeholder="••••••••"
                placeholderTextColor={colors.concrete}
                style={inputStyle}
              />
            </View>

            {error && (
              <Text style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>{error}</Text>
            )}

            <TouchableOpacity
              onPress={mode === 'sign-in' ? handleSignIn : handleSignUp}
              disabled={loading}
              style={{ backgroundColor: colors.ochre, borderRadius: 12, padding: 16, alignItems: 'center' }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                  </Text>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setError(null); setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in') }}
              style={{ marginTop: 20, alignItems: 'center' }}
            >
              <Text style={{ color: colors.concrete, fontSize: 13 }}>
                {mode === 'sign-in'
                  ? "New here? Create an account"
                  : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
