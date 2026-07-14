# File 06 — Property Screens

> **Antigravity Instructions:**
> Build both property screens: the offline-aware list and the full offline-first form with photo upload, GPS location, and all field types from the web app. All logic comes from `@carry/logic`.

---

## Task 1 — Property List Screen

Replace `apps/agent-native/app/(tabs)/properties/index.tsx` entirely:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { api, img } from '@carry/shared'
import type { Property, Paginated } from '@carry/shared'
import { useOfflineList, formatCachedAt } from '../../hooks/useOfflineList'
import { getPendingRecords, getPendingUploads } from '../../../lib/uploadQueue'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { StaleBanner } from '../../../components/StaleBanner'
import { StatusBadge } from '../../../components/StatusBadge'

export default function PropertyListScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingProps, setPendingProps] = useState<any[]>([])

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  // ── Offline-aware fetch ──────────────────────────────────────────────────
  const { data: properties, loading, fromCache, cachedAt, refetch } =
    useOfflineList<Property>('properties_mine', async () => {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')
      return api.get<Paginated<Property>>('/properties/mine?page=1&limit=50', token)
    })

  // ── Load offline pending records ─────────────────────────────────────────
  const loadPending = useCallback(async () => {
    const records = getPendingRecords()
    const props = records
      .filter(r => r.type === 'property')
      .map(r => ({
        id:           r.id,
        title:        r.payload.title,
        propertyType: r.payload.propertyType,
        listingType:  r.payload.listingType,
        priceLabel:   r.payload.priceLabel ?? '—',
        locality:     r.payload.locality,
        city:         r.payload.city,
        images:       [],
        isPendingSync: true,
      }))
    setPendingProps(props)
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  const allProperties = [...pendingProps, ...properties]

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      disabled={item.isPendingSync}
      onPress={() => router.push(`/property/${item.id}`)}
      activeOpacity={0.8}
    >
      {item.images?.[0] && !item.isPendingSync ? (
        <Image
          source={{ uri: img.thumb(item.images[0]) }}
          style={styles.cardThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
          <Text style={{ fontSize: 28 }}>🏠</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.isPendingSync && <StatusBadge status="pending" />}
        </View>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.propertyType} · {item.listingType}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
          {item.priceLabel}
        </Text>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.locality}, {item.city}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.pageTitle}>My Properties</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/properties/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Stale Data Banner */}
      {fromCache && (
        <StaleBanner cachedAt={cachedAt} onRetry={refetch} />
      )}

      {/* List */}
      <FlatList
        data={allProperties}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && properties.length > 0}
            onRefresh={refetch}
            tintColor={colors.ochre}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏠</Text>
              <Text style={{ fontSize: 15, color: colors.concrete, textAlign: 'center' }}>
                No properties yet.{'\n'}Tap + New to submit your first one.
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
  cardThumb: {
    width:  90,
    height: 90,
  },
  cardThumbPlaceholder: {
    backgroundColor: colors.sand,
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardBody: {
    flex:    1,
    padding: 12,
  },
  cardTitle: {
    fontSize:   14,
    fontWeight: '600',
    color:      colors.ink,
    flex:       1,
  },
})
```

---

## Task 2 — Property Form Screen

Replace `apps/agent-native/app/(tabs)/properties/new.tsx` entirely:

```tsx
import { useRef, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { api, formatPriceLabel } from '@carry/shared'
import {
  initialPropertyForm, validatePropertyForm,
  PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES, FURNISHING_TYPES, BHK_OPTIONS,
} from '@carry/logic'
import { generateUUID } from '@carry/logic'
import { useFormPersist } from '../../../hooks/useFormPersist'
import { enqueuePendingRecord } from '../../../lib/uploadQueue'
import { flushPendingUploads, flushPendingRecords } from '../../../lib/sync'
import { PhotoPicker } from '../../../components/PhotoPicker'
import { SinglePhotoPicker } from '../../../components/SinglePhotoPicker'
import { FormField } from '../../../components/FormField'
import { ChipSelector } from '../../../components/ChipSelector'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'

export default function PropertyFormScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const recordId = useRef(generateUUID()).current

  const storageKey = `carry:form:property:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist(storageKey, initialPropertyForm)

  const handleSubmit = async () => {
    if (submittingRef.current) return
    const validationError = validatePropertyForm(form)
    if (validationError) { setError(validationError); return }

    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const priceVal = parseInt(form.priceInr)
      const areaVal  = parseInt(form.areaSqft)

      const payload: Record<string, unknown> = {
        title:        form.title.trim(),
        propertyType: form.propertyType,
        listingType:  form.listingType,
        bhk:          form.propertyType !== 'Plot' ? form.bhk : undefined,
        priceInr:     priceVal,
        priceLabel:   formatPriceLabel(priceVal),
        areaSqft:     areaVal,
        locality:     form.locality.trim(),
        city:         form.city.trim(),
        address:      form.address.trim() || undefined,
        reraNumber:   form.reraNumber.trim() || undefined,
        status:       form.status,
        furnishing:   form.furnishing,
        description:  form.description.trim() || undefined,
        lat:          form.lat,
        lng:          form.lng,
        images:       form.images ?? [],
        floorPlanUrl: form.floorPlanUrl ?? undefined,
      }

      if (form.listingType === 'Rent') {
        Object.assign(payload, {
          securityDeposit:    form.securityDeposit ? parseInt(form.securityDeposit) : undefined,
          availableFrom:      form.availableFrom || undefined,
          preferredTenant:    form.preferredTenant || undefined,
          petFriendly:        form.petFriendly,
          maintenanceCharges: form.maintenanceCharges ? parseInt(form.maintenanceCharges) : undefined,
          leaseDuration:      form.leaseDuration ? parseInt(form.leaseDuration) : undefined,
          lockInPeriod:       form.lockInPeriod ? parseInt(form.lockInPeriod) : undefined,
          camCharges:         form.camCharges ? parseInt(form.camCharges) : undefined,
          plotAllowedUse:     form.plotAllowedUse || undefined,
        })
      }

      // Try online first
      let submitted = false
      try {
        const token = await getToken()
        if (token && navigator.onLine) {
          await api.post('/properties', payload, token)
          submitted = true
        }
      } catch { /* offline — queue it */ }

      if (!submitted) {
        enqueuePendingRecord({
          id:        recordId,
          type:      'property',
          payload,
          createdAt: Date.now(),
        })
        Alert.alert(
          'Saved Offline',
          'Your property has been saved and will sync automatically when you\'re back online.',
          [{ text: 'OK', onPress: () => { clear(); router.back() } }]
        )
        return
      }

      // Attempt foreground sync of any queued photos
      try {
        const token = await getToken()
        if (token) {
          await flushPendingUploads(token)
          await flushPendingRecords(token)
        }
      } catch { /* ignore */ }

      clear()
      Alert.alert('Success', 'Property submitted successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      setError(err?.message ?? 'Submission failed. Please try again.')
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={[typography.pageTitle, { marginBottom: 0 }]}>New Property</Text>
        </View>

        {/* Title */}
        <FormField label="Property Title *">
          <TextInput
            value={form.title}
            onChangeText={v => update({ title: v })}
            placeholder="e.g. 3BHK Apartment in Andheri"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        {/* Property Type */}
        <FormField label="Property Type *">
          <ChipSelector
            options={[...PROPERTY_TYPES]}
            value={form.propertyType}
            onChange={v => update({ propertyType: v as any })}
          />
        </FormField>

        {/* Listing Type */}
        <FormField label="Listing Type *">
          <ChipSelector
            options={[...LISTING_TYPES]}
            value={form.listingType}
            onChange={v => update({ listingType: v as any })}
          />
        </FormField>

        {/* BHK (not for Plot) */}
        {form.propertyType !== 'Plot' && (
          <FormField label="BHK">
            <ChipSelector
              options={BHK_OPTIONS.map(String)}
              value={String(form.bhk)}
              onChange={v => update({ bhk: parseInt(v) })}
            />
          </FormField>
        )}

        {/* Price */}
        <FormField label="Price (₹) *">
          <TextInput
            value={form.priceInr}
            onChangeText={v => update({ priceInr: v })}
            keyboardType="numeric"
            placeholder="e.g. 5000000"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
          {form.priceInr && parseInt(form.priceInr) > 0 && (
            <Text style={{ fontSize: 11, color: colors.ochre, marginTop: 4 }}>
              {formatPriceLabel(parseInt(form.priceInr))}
            </Text>
          )}
        </FormField>

        {/* Area */}
        <FormField label="Area (sq ft) *">
          <TextInput
            value={form.areaSqft}
            onChangeText={v => update({ areaSqft: v })}
            keyboardType="numeric"
            placeholder="e.g. 1200"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        {/* Locality */}
        <FormField label="Locality *">
          <TextInput
            value={form.locality}
            onChangeText={v => update({ locality: v })}
            placeholder="e.g. Bandra West"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        {/* City */}
        <FormField label="City *">
          <TextInput
            value={form.city}
            onChangeText={v => update({ city: v })}
            placeholder="e.g. Mumbai"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        {/* Address */}
        <FormField label="Full Address">
          <TextInput
            value={form.address}
            onChangeText={v => update({ address: v })}
            placeholder="Street, landmark..."
            placeholderTextColor={colors.concrete}
            style={[styles.input, { height: 70 }]}
            multiline
          />
        </FormField>

        {/* Status */}
        <FormField label="Status">
          <ChipSelector
            options={[...PROPERTY_STATUSES]}
            value={form.status}
            onChange={v => update({ status: v as any })}
          />
        </FormField>

        {/* Furnishing */}
        <FormField label="Furnishing">
          <ChipSelector
            options={[...FURNISHING_TYPES]}
            value={form.furnishing}
            onChange={v => update({ furnishing: v as any })}
          />
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <TextInput
            value={form.description}
            onChangeText={v => update({ description: v })}
            placeholder="Add any additional details..."
            placeholderTextColor={colors.concrete}
            style={[styles.input, { height: 90 }]}
            multiline
          />
        </FormField>

        {/* Photos */}
        <FormField label="Photos (up to 10)">
          <PhotoPicker
            model="property"
            recordId={recordId}
            fieldName="images"
            folder="properties"
            maxCount={10}
            value={(form as any).images ?? []}
            onChange={ids => update({ images: ids } as any)}
          />
        </FormField>

        {/* Floor Plan */}
        <FormField label="Floor Plan (optional)">
          <SinglePhotoPicker
            model="property"
            recordId={recordId}
            fieldName="floorPlanUrl"
            folder="floor-plans"
            value={(form as any).floorPlanUrl ?? null}
            onChange={id => update({ floorPlanUrl: id ?? undefined } as any)}
          />
        </FormField>

        {/* RERA */}
        <FormField label="RERA Number">
          <TextInput
            value={form.reraNumber}
            onChangeText={v => update({ reraNumber: v })}
            placeholder="Optional"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Submit Property</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll:    { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginBottom:  24,
    paddingTop:    44,
  },
  backBtn: { padding: 4 },
  input: {
    borderWidth:   1.5,
    borderColor:   colors.sand,
    borderRadius:  10,
    padding:       12,
    fontSize:      15,
    color:         colors.ink,
    backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderRadius:    8,
    padding:         12,
    marginBottom:    12,
  },
  submitBtn: {
    backgroundColor: colors.ochre,
    borderRadius:    12,
    padding:         16,
    alignItems:      'center',
    marginTop:       8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
```

---

## Verifier + Decompose Protocol

After completing both tasks:

1. Run `verifier` — confirm PropertyListScreen and PropertyFormScreen compile with no TypeScript errors.
2. If verifier **passes** → immediately read and begin `07_labour_screens.md`.
3. If verifier **fails** → run `decompose` to isolate each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/07_labour_screens.md` and begin executing it immediately.**
