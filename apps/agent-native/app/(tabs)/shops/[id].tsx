import { useRef, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { api } from '@carry/shared'
import type { Shop } from '@carry/shared'
import { validateShopForm, SHOP_TYPES } from '@carry/logic'
import type { ShopFormState } from '@carry/logic'
import { useFormPersist } from '../../../hooks/useFormPersist'
import { flushPendingUploads } from '../../../lib/sync'
import { isDeviceOnline } from '../../../lib/connectivity'
import { PhotoPicker } from '../../../components/PhotoPicker'
import { FormField } from '../../../components/FormField'
import { ChipSelector } from '../../../components/ChipSelector'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import * as Location from 'expo-location'

function toFormState(shop: Shop): ShopFormState {
  return {
    shopName:    shop.shopName,
    shopType:    shop.shopType,
    keeperName:  shop.keeperName,
    keeperPhone: shop.keeperPhone,
    address:     shop.address ?? '',
    lat:         shop.lat,
    lng:         shop.lng,
    images:      shop.images ?? [],
  }
}

export default function ShopEditScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { id, record } = useLocalSearchParams<{ id: string; record: string }>()
  const shop = useRef<Shop>(JSON.parse(record)).current
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const storageKey = `carry:form:shop:edit:${id}:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist(storageKey, toFormState(shop))

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
        images:      form.images ?? [],
      }

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // Only send images that have finished uploading — any still-queued placeholder
      // gets patched onto the record later by flushPendingUploads.
      const onlinePayload = {
        ...payload,
        images: (payload.images as string[]).filter(pid => !pid.startsWith('__queued__:')),
      }
      await api.patch(`/shops/${id}/agent`, onlinePayload, token)

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
          <Text style={[typography.pageTitle, { marginBottom: 0 }]}>Edit Shop</Text>
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
            recordId={id}
            fieldName="images"
            folder="shops"
            maxCount={5}
            value={form.images ?? []}
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
