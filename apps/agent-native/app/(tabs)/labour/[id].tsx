import { useRef, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { api } from '@carry/shared'
import type { Labour } from '@carry/shared'
import { validateLabourForm, GENDERS, SKILL_TYPES } from '@carry/logic'
import type { LabourFormState } from '@carry/logic'
import { useFormPersist } from '../../../hooks/useFormPersist'
import { flushPendingUploads } from '../../../lib/sync'
import { isDeviceOnline } from '../../../lib/connectivity'
import { SinglePhotoPicker } from '../../../components/SinglePhotoPicker'
import { FormField } from '../../../components/FormField'
import { ChipSelector } from '../../../components/ChipSelector'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'

function toFormState(labour: Labour): LabourFormState {
  return {
    fullName:        labour.fullName,
    age:             String(labour.age),
    gender:          labour.gender,
    skillLevel:      labour.skillLevel,
    skillType:       labour.skillType ?? '',
    phone:           labour.phone,
    minimumWage:     labour.minimumWage ? String(labour.minimumWage) : '',
    houseNo:         labour.houseNo ?? '',
    street:          labour.street ?? '',
    locality:        labour.locality ?? '',
    city:            labour.city ?? '',
    pincode:         labour.pincode ?? '',
    profilePhotoUrl: labour.profilePhotoUrl,
  }
}

export default function LabourEditScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { id, record } = useLocalSearchParams<{ id: string; record: string }>()
  const labour = useRef<Labour>(JSON.parse(record)).current
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const storageKey = `carry:form:labour:edit:${id}:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist(storageKey, toFormState(labour))

  const handleSubmit = async () => {
    if (submittingRef.current) return
    const validationError = validateLabourForm(form)
    if (validationError) { setError(validationError); return }

    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
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

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // Only send the photo if it's already uploaded — a still-queued placeholder
      // gets patched onto the record later by flushPendingUploads.
      const onlinePayload = {
        ...payload,
        profilePhotoUrl: typeof payload.profilePhotoUrl === 'string' && payload.profilePhotoUrl.startsWith('__queued__:')
          ? undefined
          : payload.profilePhotoUrl,
      }
      await api.patch(`/labour/${id}/agent`, onlinePayload, token)

      try { await flushPendingUploads(token) } catch { /* ignore */ }

      clear()
      Alert.alert('Saved', 'Your changes have been submitted for review.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      const deviceOnline = await isDeviceOnline()
      setError(
        deviceOnline
          ? (err?.message ?? 'Could not save changes. Please try again.')
          : 'You\'re offline — changes couldn\'t be saved. Your edits are kept here; try again once you\'re back online.'
      )
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
          <Text style={[typography.pageTitle, { marginBottom: 0 }]}>Edit Labour Record</Text>
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
            recordId={id}
            fieldName="profilePhotoUrl"
            folder="labour-profiles"
            value={form.profilePhotoUrl ?? null}
            onChange={pid => update({ profilePhotoUrl: pid ?? undefined })}
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
            : <Text style={styles.submitBtnText}>Save Changes</Text>
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
