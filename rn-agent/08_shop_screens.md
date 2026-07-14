# File 08 — Shop Screens

> **Antigravity Instructions:**
> Build both shop screens following the same pattern. Shop form includes GPS location capture.

---

## Task 1 — Shop List Screen

Replace `apps/agent-native/app/(tabs)/shops/index.tsx` entirely:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { api, img } from '@carry/shared'
import type { Shop, Paginated } from '@carry/shared'
import { useOfflineList } from '../../hooks/useOfflineList'
import { getPendingRecords } from '../../../lib/uploadQueue'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { StaleBanner } from '../../../components/StaleBanner'
import { StatusBadge } from '../../../components/StatusBadge'

export default function ShopListScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingShops, setPendingShops] = useState<any[]>([])

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  const { data: shopList, loading, fromCache, cachedAt, refetch } =
    useOfflineList<Shop>('shops_mine', async () => {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')
      return api.get<Paginated<Shop>>('/shops/mine?page=1&limit=50', token)
    })

  const loadPending = useCallback(() => {
    const records = getPendingRecords()
    const shops = records
      .filter(r => r.type === 'shop')
      .map(r => ({
        id:           r.id,
        shopName:     r.payload.shopName,
        shopType:     r.payload.shopType,
        keeperName:   r.payload.keeperName,
        keeperPhone:  r.payload.keeperPhone,
        address:      r.payload.address,
        images:       [],
        isPendingSync: true,
      }))
    setPendingShops(shops)
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  const allShops = [...pendingShops, ...shopList]

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      disabled={item.isPendingSync}
      activeOpacity={0.8}
    >
      {item.images?.[0] && !item.isPendingSync ? (
        <Image
          source={{ uri: img.thumb(item.images[0]) }}
          style={styles.cardThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardThumb, { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 28 }}>🏪</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>{item.shopName}</Text>
          {item.isPendingSync && <StatusBadge status="pending" />}
        </View>
        <Text style={{ fontSize: 13, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
          {item.shopType}
        </Text>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.keeperName} · {item.keeperPhone}
        </Text>
        {item.address && (
          <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.pageTitle}>My Shops</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/shops/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {fromCache && <StaleBanner cachedAt={cachedAt} onRetry={refetch} />}

      <FlatList
        data={allShops}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && shopList.length > 0}
            onRefresh={refetch}
            tintColor={colors.ochre}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏪</Text>
              <Text style={{ fontSize: 15, color: colors.concrete, textAlign: 'center' }}>
                No shops yet.{'\n'}Tap + New to add the first one.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.sand,
  },
  newBtn: {
    backgroundColor: colors.ochre, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardThumb: { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
})
```

---

## Task 2 — Shop Form Screen

Replace `apps/agent-native/app/(tabs)/shops/new.tsx` entirely:

```tsx
import { useRef, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { api } from '@carry/shared'
import { initialShopForm, validateShopForm, SHOP_TYPES, generateUUID } from '@carry/logic'
import { useFormPersist } from '../../../hooks/useFormPersist'
import { enqueuePendingRecord } from '../../../lib/uploadQueue'
import { flushPendingUploads, flushPendingRecords } from '../../../lib/sync'
import { PhotoPicker } from '../../../components/PhotoPicker'
import { FormField } from '../../../components/FormField'
import { ChipSelector } from '../../../components/ChipSelector'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import * as Location from 'expo-location'

export default function ShopFormScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const recordId = useRef(generateUUID()).current

  const storageKey = `carry:form:shop:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist(storageKey, initialShopForm)

  const captureLocation = async () => {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to add GPS coordinates.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      update({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    } catch {
      Alert.alert('Location Error', 'Could not get your location. Please try again.')
    } finally {
      setLocating(false)
    }
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    const validationError = validateShopForm(form)
    if (validationError) { setError(validationError); return }

    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        shopName:    form.shopName.trim(),
        shopType:    form.shopType.trim(),
        keeperName:  form.keeperName.trim(),
        keeperPhone: form.keeperPhone.trim(),
        address:     form.address.trim() || undefined,
        lat:         form.lat,
        lng:         form.lng,
        images:      (form as any).images ?? [],
      }

      let submitted = false
      try {
        const token = await getToken()
        if (token) {
          await api.post('/shops', payload, token)
          submitted = true
        }
      } catch { /* offline */ }

      if (!submitted) {
        enqueuePendingRecord({
          id: recordId, type: 'shop', payload, createdAt: Date.now(),
        })
        Alert.alert(
          'Saved Offline',
          'Shop record saved locally and will sync when you\'re back online.',
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
      Alert.alert('Success', 'Shop record submitted!', [
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
          <Text style={[typography.pageTitle, { marginBottom: 0 }]}>New Shop</Text>
        </View>

        <FormField label="Shop Name *">
          <TextInput
            value={form.shopName}
            onChangeText={v => update({ shopName: v })}
            placeholder="e.g. Sharma Cement Store"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Shop Type *">
          <ChipSelector
            options={[...SHOP_TYPES]}
            value={form.shopType}
            onChange={v => update({ shopType: v })}
            wrap
          />
        </FormField>

        <FormField label="Keeper / Owner Name *">
          <TextInput
            value={form.keeperName}
            onChangeText={v => update({ keeperName: v })}
            placeholder="e.g. Suresh Sharma"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Keeper Phone *">
          <TextInput
            value={form.keeperPhone}
            onChangeText={v => update({ keeperPhone: v })}
            keyboardType="phone-pad"
            placeholder="10-digit mobile"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </FormField>

        <FormField label="Address">
          <TextInput
            value={form.address}
            onChangeText={v => update({ address: v })}
            placeholder="Full address / landmark"
            placeholderTextColor={colors.concrete}
            style={[styles.input, { height: 70 }]}
            multiline
          />
        </FormField>

        {/* GPS Location */}
        <FormField label="GPS Location">
          {form.lat && form.lng ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 12, color: colors.concrete, flex: 1 }}>
                📍 {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </Text>
              <TouchableOpacity onPress={() => update({ lat: undefined, lng: undefined })}>
                <Text style={{ fontSize: 12, color: colors.error }}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={captureLocation}
              disabled={locating}
            >
              {locating
                ? <ActivityIndicator color={colors.ochre} size="small" />
                : <Text style={{ color: colors.ochre, fontWeight: '600', fontSize: 13 }}>
                    📍 Capture Current Location
                  </Text>
              }
            </TouchableOpacity>
          )}
        </FormField>

        <FormField label="Shop Photos (up to 5)">
          <PhotoPicker
            model="shop"
            recordId={recordId}
            fieldName="images"
            folder="shops"
            maxCount={5}
            value={(form as any).images ?? []}
            onChange={ids => update({ images: ids } as any)}
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
            : <Text style={styles.submitBtnText}>Submit Shop</Text>
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
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: 10,
    padding: 12, fontSize: 15, color: colors.ink, backgroundColor: '#fff',
  },
  locationBtn: {
    borderWidth: 1.5, borderColor: colors.ochre, borderRadius: 10,
    padding: 12, alignItems: 'center', borderStyle: 'dashed',
  },
  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.08)', borderRadius: 8, padding: 12, marginBottom: 12,
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

1. Run `verifier` — confirm ShopListScreen and ShopFormScreen compile.
2. If verifier **passes** → immediately read and begin `09_components.md`.
3. If verifier **fails** → run `decompose` to isolate each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/09_components.md` and begin executing it immediately.**
