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
