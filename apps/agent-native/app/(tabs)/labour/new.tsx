import { useRef, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { api } from '@carry/shared'
import {
  initialLabourForm, validateLabourForm,
  GENDERS, SKILL_TYPES,
} from '@carry/logic'
import { generateUUID } from '@carry/logic'
import { useFormPersist } from '../../../hooks/useFormPersist'
import { enqueuePendingRecord } from '../../../lib/uploadQueue'
import { flushPendingUploads, flushPendingRecords } from '../../../lib/sync'
import { isDeviceOnline } from '../../../lib/connectivity'
import { SinglePhotoPicker } from '../../../components/SinglePhotoPicker'
import { FormField } from '../../../components/FormField'
import { ChipSelector } from '../../../components/ChipSelector'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'

export default function LabourFormScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const recordId = useRef(generateUUID()).current

  const storageKey = `carry:form:labour:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist(storageKey, initialLabourForm)

  const handleSubmit = async () => {
    if (submittingRef.current) return
    const validationError = validateLabourForm(form)
    if (validationError) { setError(validationError); return }

    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        id:          recordId,
        fullName:    form.fullName.trim(),
        age:         parseInt(form.age),
        gender:      form.gender,
        skillLevel:  form.skillLevel,
        skillType:   form.skillLevel === 'Skilled' ? form.skillType : undefined,
        phone:       form.phone.trim(),
        minimumWage: form.minimumWage ? parseInt(form.minimumWage) : undefined,
        houseNo:     form.houseNo.trim() || undefined,
        street:      form.street.trim() || undefined,
        locality:    form.locality.trim() || undefined,
        city:        form.city.trim() || undefined,
        pincode:     form.pincode.trim() || undefined,
        profilePhotoUrl: form.profilePhotoUrl ?? undefined,
      }

      let submitted = false
      try {
        const token = await getToken()
        if (token) {
          // Only send the photo if it's already uploaded — a still-queued placeholder
          // gets patched onto the record later by flushPendingUploads. The full `payload`
          // (with the placeholder intact) is kept for the offline-queue fallback below.
          const onlinePayload = {
            ...payload,
            profilePhotoUrl: typeof payload.profilePhotoUrl === 'string' && payload.profilePhotoUrl.startsWith('__queued__:')
              ? undefined
              : payload.profilePhotoUrl,
          }
          await api.post('/labour', onlinePayload, token)
          submitted = true
        }
      } catch {
        // Fall through — determine below whether this was a real connectivity
        // issue or a request that reached the server and failed.
      }

      if (!submitted) {
        enqueuePendingRecord({
          id: recordId, type: 'labour', payload, createdAt: Date.now(),
        })
        const deviceOnline = await isDeviceOnline()
        Alert.alert(
          deviceOnline ? 'Saved — Server Unavailable' : 'Saved Offline',
          deviceOnline
            ? 'Labour record saved locally — the server didn\'t respond, but it will retry automatically.'
            : 'Labour record saved locally and will sync when you\'re back online.',
          [{ text: 'OK', onPress: () => { clear(); router.back() } }]
        )
        return
      }

      try {
        const token = await getToken()
        if (token) {
          await flushPendingUploads(token)
          await flushPendingRecords(token)
        }
      } catch { /* ignore */ }

      clear()
      Alert.alert('Success', 'Labour record submitted!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      setError(err?.message ?? 'Submission failed.')
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={[typography.pageTitle, { marginBottom: 0 }]}>New Labour Record</Text>
        </View>

        <FormField label="Full Name *">
          <TextInput
            value={form.fullName}
            onChangeText={v => update({ fullName: v })}
            placeholder="e.g. Ramesh Kumar"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Age *">
          <TextInput
            value={form.age}
            onChangeText={v => update({ age: v })}
            keyboardType="numeric"
            placeholder="e.g. 32"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Gender">
          <ChipSelector
            options={[...GENDERS]}
            value={form.gender}
            onChange={v => update({ gender: v as any })}
          />
        </FormField>

        <FormField label="Skill Level">
          <ChipSelector
            options={['Skilled', 'Non-Skilled']}
            value={form.skillLevel}
            onChange={v => update({ skillLevel: v as any })}
          />
        </FormField>

        {form.skillLevel === 'Skilled' && (
          <FormField label="Skill Type">
            <ChipSelector
              options={[...SKILL_TYPES]}
              value={form.skillType}
              onChange={v => update({ skillType: v })}
              wrap
            />
          </FormField>
        )}

        <FormField label="Phone Number *">
          <TextInput
            value={form.phone}
            onChangeText={v => update({ phone: v })}
            keyboardType="phone-pad"
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Minimum Daily Wage (₹)">
          <TextInput
            value={form.minimumWage}
            onChangeText={v => update({ minimumWage: v })}
            keyboardType="numeric"
            placeholder="e.g. 600"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Locality">
          <TextInput
            value={form.locality}
            onChangeText={v => update({ locality: v })}
            placeholder="Area / locality"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="City">
          <TextInput
            value={form.city}
            onChangeText={v => update({ city: v })}
            placeholder="e.g. Pune"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Profile Photo">
          <SinglePhotoPicker
            model="labour"
            recordId={recordId}
            fieldName="profilePhotoUrl"
            folder="labour-profiles"
            value={form.profilePhotoUrl ?? null}
            onChange={id => update({ profilePhotoUrl: id ?? undefined })}
          />
        </FormField>

        {error && (
          <View style={styles.errorBox}>
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Submit Labour Record</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 24, paddingTop: 44,
  },
  input: {
    borderWidth: 1.5, borderColor: colors.sand,
    borderRadius: 10, padding: 12, fontSize: 15,
    color: colors.ink, backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderRadius: 8, padding: 12, marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: colors.ochre, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
