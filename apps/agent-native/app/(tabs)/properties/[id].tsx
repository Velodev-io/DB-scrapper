import { useRef, useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { api, formatPriceLabel } from '@carry/shared'
import type { Property } from '@carry/shared'
import {
  validatePropertyForm,
  PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES, FURNISHING_TYPES, BHK_OPTIONS,
} from '@carry/logic'
import type { PropertyFormState } from '@carry/logic'
import { useFormPersist } from '../../../hooks/useFormPersist'
import { flushPendingUploads } from '../../../lib/sync'
import { isDeviceOnline } from '../../../lib/connectivity'
import { PhotoPicker } from '../../../components/PhotoPicker'
import { SinglePhotoPicker } from '../../../components/SinglePhotoPicker'
import { FormField } from '../../../components/FormField'
import { ChipSelector } from '../../../components/ChipSelector'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'

function toFormState(property: Property): PropertyFormState {
  return {
    title:              property.title,
    propertyType:       property.propertyType,
    listingType:        property.listingType,
    bhk:                property.bhk ?? 2,
    priceInr:           String(property.priceInr),
    areaSqft:           String(property.areaSqft),
    locality:           property.locality,
    city:               property.city,
    address:            property.address ?? '',
    reraNumber:         property.reraNumber ?? '',
    status:             property.status,
    furnishing:         property.furnishing ?? 'Unfurnished',
    description:        property.description ?? '',
    lat:                property.lat,
    lng:                property.lng,
    securityDeposit:    property.securityDeposit ? String(property.securityDeposit) : '',
    availableFrom:      property.availableFrom ?? '',
    preferredTenant:    property.preferredTenant ?? 'Any',
    petFriendly:        property.petFriendly ?? false,
    maintenanceCharges: property.maintenanceCharges ? String(property.maintenanceCharges) : '',
    leaseDuration:      property.leaseDuration ? String(property.leaseDuration) : '',
    lockInPeriod:       property.lockInPeriod ? String(property.lockInPeriod) : '',
    camCharges:         property.camCharges ? String(property.camCharges) : '',
    plotAllowedUse:     property.plotAllowedUse ?? 'Any',
    images:             property.images ?? [],
    floorPlanUrl:       property.floorPlanUrl,
  }
}

export default function PropertyEditScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { id, record } = useLocalSearchParams<{ id: string; record: string }>()
  const property = useRef<Property>(JSON.parse(record)).current
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const storageKey = `carry:form:property:edit:${id}:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist(storageKey, toFormState(property))

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
          lockInPeriod:       form.lockInPeriod ? parseInt(form.lockInPeriod) : undefined,
          leaseDuration:      form.leaseDuration ? parseInt(form.leaseDuration) : undefined,
          camCharges:         form.camCharges ? parseInt(form.camCharges) : undefined,
          plotAllowedUse:     form.plotAllowedUse || undefined,
        })
      }

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // Only send images/floor plan that have finished uploading — any still-queued
      // placeholder gets patched onto the record later by flushPendingUploads once
      // its Cloudinary upload completes.
      const onlinePayload = {
        ...payload,
        images: (payload.images as string[]).filter(pid => !pid.startsWith('__queued__:')),
        floorPlanUrl: typeof payload.floorPlanUrl === 'string' && payload.floorPlanUrl.startsWith('__queued__:')
          ? undefined
          : payload.floorPlanUrl,
      }
      await api.patch(`/properties/${id}/agent`, onlinePayload, token)

      // Attempt foreground sync of any newly queued photos
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={[typography.pageTitle, { marginBottom: 0 }]}>Edit Property</Text>
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
            recordId={id}
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
            recordId={id}
            fieldName="floorPlanUrl"
            folder="floor-plans"
            value={(form as any).floorPlanUrl ?? null}
            onChange={pid => update({ floorPlanUrl: pid ?? undefined } as any)}
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
            : <Text style={styles.submitBtnText}>Save Changes</Text>
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
