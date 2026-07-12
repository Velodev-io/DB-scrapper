import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import {
  api,
  PROPERTY_TYPES,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  FURNISHING_TYPES,
  formatPriceLabel,
  PREFERRED_TENANT_TYPES,
  PLOT_ALLOWED_USE_TYPES
} from '@carry/shared'
import { useFormPersist } from '../../hooks/useFormPersist'
import { PhotoUploader } from '../../components/PhotoUploader/PhotoUploader'
import { LocationPicker } from '../../components/LocationPicker'
import { uploadManager } from '../../lib/UploadManager'
import { enqueuePendingRecord, updateRecordId } from '../../lib/uploadQueue'
import { generateUUID } from '../../lib/uuid'

interface FormState {
  title: string
  propertyType: string
  listingType: string
  bhk: number
  priceInr: string
  areaSqft: string
  locality: string
  city: string
  address: string
  reraNumber: string
  status: string
  furnishing: string
  description: string
  lat: number | undefined
  lng: number | undefined

  // Rent-specific fields
  securityDeposit: string
  availableFrom: string
  preferredTenant: string
  petFriendly: boolean
  maintenanceCharges: string
  leaseDuration: string
  lockInPeriod: string
  camCharges: string
  plotAllowedUse: string
}

const initialForm: FormState = {
  title: '',
  propertyType: 'Apartment',
  listingType: 'Sale',
  bhk: 2,
  priceInr: '',
  areaSqft: '',
  locality: '',
  city: '',
  address: '',
  reraNumber: '',
  status: 'Ready',
  furnishing: 'Unfurnished',
  description: '',
  lat: undefined,
  lng: undefined,
  securityDeposit: '',
  availableFrom: '',
  preferredTenant: 'Any',
  petFriendly: false,
  maintenanceCharges: '',
  leaseDuration: '',
  lockInPeriod: '',
  camCharges: '',
  plotAllowedUse: 'Any',
}

export function PropertyForm() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const storageKey = `carry:form:property:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist<FormState>(storageKey, initialForm)

  // Clear upload queues on mount to avoid bleeding
  useEffect(() => {
    uploadManager.clear('images')
    uploadManager.clear('floorPlanUrl')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)

    if (!form.title || !form.priceInr || !form.locality || !form.city) {
      setError('Please fill in all required fields.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      const recordId = generateUUID()
      const allImageIds = uploadManager.getUploadedIds('images')
      const allFloorPlanIds = uploadManager.getUploadedIds('floorPlanUrl')

      // Track queued photo localIds so we can link them to the real DB record after POST
      const queuedImageLocalIds = allImageIds
        .filter(id => id.startsWith('__queued__:'))
        .map(id => id.replace('__queued__:', ''))
      const queuedFloorPlanLocalId = allFloorPlanIds
        .find(id => id.startsWith('__queued__:'))
        ?.replace('__queued__:', '') ?? null

      const priceVal = parseInt(form.priceInr)

      const rentPayload = form.listingType === 'Rent' ? {
        securityDeposit: form.securityDeposit ? parseInt(form.securityDeposit) : null,
        availableFrom: form.availableFrom || null,
        preferredTenant: form.preferredTenant || null,
        petFriendly: form.petFriendly,
        maintenanceCharges: form.maintenanceCharges ? parseInt(form.maintenanceCharges) : null,
        leaseDuration: form.leaseDuration ? parseInt(form.leaseDuration) : null,
        lockInPeriod: form.lockInPeriod ? parseInt(form.lockInPeriod) : null,
        camCharges: form.camCharges ? parseInt(form.camCharges) : null,
        plotAllowedUse: form.plotAllowedUse || null,
      } : {
        securityDeposit: null,
        availableFrom: null,
        preferredTenant: null,
        petFriendly: null,
        maintenanceCharges: null,
        leaseDuration: null,
        lockInPeriod: null,
        camCharges: null,
        plotAllowedUse: null,
      }

      if (!navigator.onLine) {
        const tempId = `temp-${recordId}`

        // Remap all queued photo uploads to this temp record ID so the
        // background flusher knows which record they belong to
        for (const localId of queuedImageLocalIds) {
          await updateRecordId(localId, tempId)
        }
        if (queuedFloorPlanLocalId) {
          await updateRecordId(queuedFloorPlanLocalId, tempId)
        }

        // Store the payload with the bare queued local IDs so the flusher
        // can resolve them to real Cloudinary public IDs when it runs
        await enqueuePendingRecord({
          id: tempId,
          type: 'property',
          payload: {
            id: recordId,
            title: form.title,
            propertyType: form.propertyType,
            listingType: form.listingType,
            bhk: form.propertyType === 'Plot' || form.propertyType === 'Commercial' ? null : form.bhk,
            priceInr: priceVal,
            priceLabel: formatPriceLabel(priceVal),
            areaSqft: 0,
            locality: form.locality,
            city: form.city,
            address: form.address || null,
            reraNumber: form.reraNumber || null,
            status: form.status,
            furnishing: form.furnishing || null,
            description: form.description || null,
            images: queuedImageLocalIds,          // bare UUIDs
            floorPlanUrl: queuedFloorPlanLocalId, // bare UUID or null
            lat: form.lat || null,
            lng: form.lng || null,
            ...rentPayload,
          },
          createdAt: Date.now(),
        })

        clear()
        uploadManager.clear('images')
        uploadManager.clear('floorPlanUrl')
        navigate('/properties')
        return
      }

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // Only real Cloudinary IDs go to the API — filter out __queued__: placeholders.
      // Queued uploads will be patched onto the record by flushUploadQueueForeground
      // once they finish uploading to Cloudinary.
      const images = allImageIds.filter(id => !id.startsWith('__queued__:'))
      const floorPlanUrl = allFloorPlanIds.find(id => !id.startsWith('__queued__:')) ?? null

      const payload = {
        id: recordId,
        title: form.title,
        propertyType: form.propertyType,
        listingType: form.listingType,
        bhk: form.propertyType === 'Plot' || form.propertyType === 'Commercial' ? null : form.bhk,
        priceInr: priceVal,
        priceLabel: formatPriceLabel(priceVal),
        areaSqft: 0,
        locality: form.locality,
        city: form.city,
        address: form.address || null,
        reraNumber: form.reraNumber || null,
        status: form.status,
        furnishing: form.furnishing || null,
        description: form.description || null,
        images,
        floorPlanUrl,
        lat: form.lat || null,
        lng: form.lng || null,
        ...rentPayload,
      }

      const newProp = await api.post<{ id: string }>('/properties', payload, token)

      // Link any still-queued photo uploads to the real DB record ID so that
      // flushUploadQueueForeground can patch them in via PATCH /uploads/patch-queued
      // once they finish uploading to Cloudinary in the background
      for (const localId of queuedImageLocalIds) {
        await updateRecordId(localId, newProp.id)
      }
      if (queuedFloorPlanLocalId) {
        await updateRecordId(queuedFloorPlanLocalId, newProp.id)
      }

      clear()
      uploadManager.clear('images')
      uploadManager.clear('floorPlanUrl')
      navigate('/properties')
    } catch (err: any) {
      setError(err.message || 'Failed to submit property')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', padding: '0.25rem',
            fontSize: '1.5rem', cursor: 'pointer', color: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Submit Property</h1>
      </div>
      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="label">Title *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. 3BHK Premium Apartment"
          />
        </div>

        <div className="form-field">
          <label className="label">Property Type</label>
          <div className="chip-group">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip ${form.propertyType === type ? 'active' : ''}`}
                onClick={() => update({ propertyType: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="label">Listing Type</label>
          <div className="chip-group">
            {LISTING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip ${form.listingType === type ? 'active' : ''}`}
                onClick={() => update({ listingType: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {form.propertyType !== 'Plot' && form.propertyType !== 'Commercial' && (
          <div className="form-field">
            <label className="label">BHK</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="chip"
                onClick={() => update({ bhk: Math.max(1, form.bhk - 1) })}
                disabled={form.bhk <= 1}
              >
                -
              </button>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, minWidth: '2rem', textAlign: 'center' }}>
                {form.bhk}
              </span>
              <button
                type="button"
                className="chip"
                onClick={() => update({ bhk: Math.min(10, form.bhk + 1) })}
                disabled={form.bhk >= 10}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="form-field">
          <label className="label">
            {form.listingType === 'Rent' ? 'Rent / Month (INR) *' : 'Price (INR) *'}
          </label>
          <input
            type="number"
            className="form-input"
            required
            value={form.priceInr}
            onChange={(e) => update({ priceInr: e.target.value })}
            placeholder={form.listingType === 'Rent' ? 'e.g. 25000' : 'e.g. 7500000'}
          />
          {form.priceInr && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ochre)' }}>
              Auto-label: {formatPriceLabel(parseInt(form.priceInr) || 0)}{form.listingType === 'Rent' && ' / month'}
            </div>
          )}
        </div>

        {form.listingType === 'Rent' && (
          <div className="rent-fields-section" style={{ border: '1px solid var(--sand)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--ochre)', fontSize: '1rem' }}>Rent Specific Details (Optional)</h3>
            
            <div className="form-field">
              <label className="label">Security Deposit (INR)</label>
              <input
                type="number"
                className="form-input"
                value={form.securityDeposit}
                onChange={(e) => update({ securityDeposit: e.target.value })}
                placeholder="e.g. 50000"
              />
            </div>

            {(form.propertyType === 'Apartment' || form.propertyType === 'Villa' || form.propertyType === 'Commercial') && (
              <div className="form-field">
                <label className="label">Available From</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.availableFrom}
                  onChange={(e) => update({ availableFrom: e.target.value })}
                />
              </div>
            )}

            {(form.propertyType === 'Apartment' || form.propertyType === 'Villa') && (
              <div className="form-field">
                <label className="label">Preferred Tenant</label>
                <div className="chip-group">
                  {PREFERRED_TENANT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`chip ${form.preferredTenant === type ? 'active' : ''}`}
                      onClick={() => update({ preferredTenant: type })}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(form.propertyType === 'Apartment' || form.propertyType === 'Villa') && (
              <div className="form-field">
                <label className="label">Pet Friendly</label>
                <div className="chip-group">
                  <button
                    type="button"
                    className={`chip ${form.petFriendly ? 'active' : ''}`}
                    onClick={() => update({ petFriendly: true })}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`chip ${!form.petFriendly ? 'active' : ''}`}
                    onClick={() => update({ petFriendly: false })}
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {(form.propertyType === 'Apartment' || form.propertyType === 'Villa' || form.propertyType === 'Commercial') && (
              <div className="form-field">
                <label className="label">Maintenance Charges (INR/month)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.maintenanceCharges}
                  onChange={(e) => update({ maintenanceCharges: e.target.value })}
                  placeholder="e.g. 3000"
                />
              </div>
            )}

            {(form.propertyType === 'Plot' || form.propertyType === 'Commercial') && (
              <div className="form-field">
                <label className="label">Minimum Lease Duration (Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.leaseDuration}
                  onChange={(e) => update({ leaseDuration: e.target.value })}
                  placeholder="e.g. 11"
                />
              </div>
            )}

            {form.propertyType === 'Commercial' && (
              <>
                <div className="form-field">
                  <label className="label">Lock-in Period (Months)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.lockInPeriod}
                    onChange={(e) => update({ lockInPeriod: e.target.value })}
                    placeholder="e.g. 6"
                  />
                </div>
                <div className="form-field">
                  <label className="label">CAM Charges (INR/month)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.camCharges}
                    onChange={(e) => update({ camCharges: e.target.value })}
                    placeholder="e.g. 5000"
                  />
                </div>
              </>
            )}

            {form.propertyType === 'Plot' && (
              <div className="form-field">
                <label className="label">Allowed Use</label>
                <div className="chip-group">
                  {PLOT_ALLOWED_USE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`chip ${form.plotAllowedUse === type ? 'active' : ''}`}
                      onClick={() => update({ plotAllowedUse: type })}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="form-field">
          <label className="label">Locality *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.locality}
            onChange={(e) => update({ locality: e.target.value })}
            placeholder="e.g. Indiranagar"
          />
        </div>

        <div className="form-field">
          <label className="label">City *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="e.g. Bengaluru"
          />
        </div>

        <div className="form-field">
          <label className="label">Full Address</label>
          <textarea
            className="form-textarea"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Complete address (optional)"
          />
        </div>

        <div className="form-field">
          <label className="label">RERA Number</label>
          <input
            type="text"
            className="form-input"
            value={form.reraNumber}
            onChange={(e) => update({ reraNumber: e.target.value })}
            placeholder="PRM/KA/RERA/... (optional)"
          />
        </div>

        <div className="form-field">
          <label className="label">Status</label>
          <div className="chip-group">
            {PROPERTY_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`chip ${form.status === status ? 'active' : ''}`}
                onClick={() => update({ status })}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="label">Furnishing</label>
          <div className="chip-group">
            {FURNISHING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip ${form.furnishing === type ? 'active' : ''}`}
                onClick={() => update({ furnishing: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="label">Description</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Describe the property highlights..."
          />
        </div>

        <div className="form-field">
          <label className="label">Location Coords (GPS)</label>
          <LocationPicker
            lat={form.lat}
            lng={form.lng}
            onChange={(lat, lng) => update({ lat, lng })}
          />
        </div>

        <div className="form-field" style={{ marginTop: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>Images (Gallery)</label>
          <PhotoUploader scope="images" folder="properties" label="Add Property Photos" />
        </div>

        <div className="form-field" style={{ marginTop: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>Floor Plan</label>
          <PhotoUploader scope="floorPlanUrl" folder="properties" label="Add Floor Plan" maxPhotos={1} />
        </div>

        <div className="submit-bar">
          <button
            type="submit"
            className="btn-primary btn-ochre"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Property'}
          </button>
        </div>
      </form>
    </div>
  )
}
