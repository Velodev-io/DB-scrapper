# File 07 — Labour Screens

> **Antigravity Instructions:**
> Build both labour screens following the exact same pattern as property screens. All logic from `@carry/logic`, fully offline-first.

---

## Task 1 — Labour List Screen

Replace `apps/agent-native/app/(tabs)/labour/index.tsx` entirely:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { api, img } from '@carry/shared'
import type { Labour, Paginated } from '@carry/shared'
import { useOfflineList, formatCachedAt } from '../../hooks/useOfflineList'
import { getPendingRecords } from '../../../lib/uploadQueue'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { StaleBanner } from '../../../components/StaleBanner'
import { StatusBadge } from '../../../components/StatusBadge'

export default function LabourListScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingLabour, setPendingLabour] = useState<any[]>([])

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  const { data: labourList, loading, fromCache, cachedAt, refetch } =
    useOfflineList<Labour>('labour_mine', async () => {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')
      return api.get<Paginated<Labour>>('/labour/mine?page=1&limit=50', token)
    })

  const loadPending = useCallback(async () => {
    const records = getPendingRecords()
    const labs = records
      .filter(r => r.type === 'labour')
      .map(r => ({
        id:              r.id,
        fullName:        r.payload.fullName,
        age:             r.payload.age,
        gender:          r.payload.gender,
        skillLevel:      r.payload.skillLevel,
        skillType:       r.payload.skillType,
        phone:           r.payload.phone,
        city:            r.payload.city,
        profilePhotoUrl: null,
        isPendingSync:   true,
      }))
    setPendingLabour(labs)
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  const allLabour = [...pendingLabour, ...labourList]

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      disabled={item.isPendingSync}
      activeOpacity={0.8}
    >
      {item.profilePhotoUrl && !item.isPendingSync ? (
        <Image
          source={{ uri: img.thumb(item.profilePhotoUrl) }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 28 }}>👷</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>{item.fullName}</Text>
          {item.isPendingSync && <StatusBadge status="pending" />}
        </View>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.age} yrs · {item.gender}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
          {item.skillLevel}{item.skillType ? ` · ${item.skillType}` : ''}
        </Text>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>{item.phone}</Text>
        {item.city && <Text style={{ fontSize: 11, color: colors.concrete }}>{item.city}</Text>}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.pageTitle}>My Labour</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/labour/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {fromCache && <StaleBanner cachedAt={cachedAt} onRetry={refetch} />}

      <FlatList
        data={allLabour}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && labourList.length > 0}
            onRefresh={refetch}
            tintColor={colors.ochre}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>👷</Text>
              <Text style={{ fontSize: 15, color: colors.concrete, textAlign: 'center' }}>
                No labour records yet.{'\n'}Tap + New to add the first one.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingTop:     60,
    paddingBottom:  16,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  newBtn: {
    backgroundColor: colors.ochre,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:   8,
  },
  newBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection:   'row',
    backgroundColor: '#fff',
    borderRadius:    12,
    marginBottom:    12,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  avatar:  { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
})
```

---

## Task 2 — Labour Form Screen

Replace `apps/agent-native/app/(tabs)/labour/new.tsx` entirely:

```tsx
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
        profilePhotoUrl: (form as any).profilePhotoUrl ?? undefined,
      }

      let submitted = false
      try {
        const token = await getToken()
        if (token) {
          await api.post('/labour', payload, token)
          submitted = true
        }
      } catch { /* offline */ }

      if (!submitted) {
        enqueuePendingRecord({
          id: recordId, type: 'labour', payload, createdAt: Date.now(),
        })
        Alert.alert(
          'Saved Offline',
          'Labour record saved locally and will sync when you\'re back online.',
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
            value={(form as any).profilePhotoUrl ?? null}
            onChange={id => update({ profilePhotoUrl: id ?? undefined } as any)}
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
```

---

## Verifier + Decompose Protocol

After completing both tasks:

1. Run `verifier` — confirm LabourListScreen and LabourFormScreen compile with no TypeScript errors.
2. If verifier **passes** → immediately read and begin `08_shop_screens.md`.
3. If verifier **fails** → run `decompose` to isolate each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/08_shop_screens.md` and begin executing it immediately.**
