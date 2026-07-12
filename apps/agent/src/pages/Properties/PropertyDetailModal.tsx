import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  api,
  img,
  type Property,
  PROPERTY_TYPES,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  FURNISHING_TYPES,
  formatPriceLabel,
} from '@carry/shared'
import { PhotoUploader } from '../../components/PhotoUploader/PhotoUploader'
import { LocationPicker } from '../../components/LocationPicker'
import { uploadManager } from '../../lib/UploadManager'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'

interface Props {
  property: Property
  onClose: () => void
  onSaved: (updated: Property) => void
}

export function PropertyDetailModal({ property, onClose, onSaved }: Props) {
  const { getToken } = useAuth()
  const { stats: imgStats } = usePhotoUpload('prop-edit-images')
  const { stats: floorStats } = usePhotoUpload('prop-edit-floor')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUploading = imgStats.uploading > 0 || imgStats.queued > 0 || floorStats.uploading > 0 || floorStats.queued > 0

  // Edit form state — initialise from the property record
  const [form, setForm] = useState({
    title:        property.title,
    propertyType: property.propertyType as string,
    listingType:  property.listingType  as string,
    bhk:          property.bhk          ?? 2,
    priceInr:     String(property.priceInr),
    areaSqft:     String(property.areaSqft),
    locality:     property.locality,
    city:         property.city,
    address:      property.address      ?? '',
    reraNumber:   property.reraNumber   ?? '',
    status:       property.status       as string,
    furnishing:   property.furnishing   ?? '',
    description:  property.description  ?? '',
    lat:          property.lat          as number | undefined,
    lng:          property.lng          as number | undefined,
    // We track images separately below to handle add/remove
    images:       [...(property.images ?? [])],
    floorPlanUrl: property.floorPlanUrl ?? '',
  })

  const submittingRef = useRef(false)

  // Clear upload manager scopes when entering edit mode
  useEffect(() => {
    if (mode === 'edit') {
      uploadManager.clear('prop-edit-images')
      uploadManager.clear('prop-edit-floor')
    }
  }, [mode])

  function update(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }))
  }

  function removeExistingImage(pubId: string) {
    setForm(f => ({ ...f, images: f.images.filter(id => id !== pubId) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)

    if (!form.title || !form.priceInr || !form.locality || !form.city) {
      setError('Please fill in all required fields.')
      return
    }

    submittingRef.current = true
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // Merge existing images (minus removed) + newly uploaded ones
      const newImageIds = uploadManager
        .getUploadedIds('prop-edit-images')
        .filter(id => !id.startsWith('__queued__:'))
      const newFloorPlan = uploadManager
        .getUploadedIds('prop-edit-floor')
        .filter(id => !id.startsWith('__queued__:'))[0] ?? null

      const priceVal = parseInt(form.priceInr)
      const payload: Record<string, any> = {
        title:        form.title,
        propertyType: form.propertyType,
        listingType:  form.listingType,
        bhk:          form.propertyType === 'Plot' || form.propertyType === 'Commercial' ? null : form.bhk,
        priceInr:     priceVal,
        priceLabel:   formatPriceLabel(priceVal),
        areaSqft:     parseInt(form.areaSqft) || 0,
        locality:     form.locality,
        city:         form.city,
        address:      form.address     || null,
        reraNumber:   form.reraNumber  || null,
        status:       form.status,
        furnishing:   form.furnishing  || null,
        description:  form.description || null,
        images:       [...form.images, ...newImageIds],
        floorPlanUrl: newFloorPlan ?? (form.floorPlanUrl || null),
        lat:          form.lat ?? null,
        lng:          form.lng ?? null,
      }

      const updated = await api.patch<Property>(`/properties/${property.id}/agent`, payload, token)
      uploadManager.clear('prop-edit-images')
      uploadManager.clear('prop-edit-floor')
      onSaved(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending:  'var(--ochre)',
    reviewed: '#2a9d48',
    deleted:  '#c0392b',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          margin: '0 auto',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          background: 'var(--bone)',
          borderRadius: '1rem 1rem 0 0',
          zIndex: 201,
          padding: '1.25rem 1rem calc(2rem + env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: 'var(--sand)', borderRadius: 99, margin: '0 auto 1rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            {mode === 'view' ? 'Property Details' : 'Edit Property'}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {mode === 'view' && (
              <button
                type="button"
                className="chip active"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => setMode('edit')}
              >
                ✏️ Edit
              </button>
            )}
            <button
              type="button"
              className="chip"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* ── VIEW MODE ── */}
        {mode === 'view' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Status badge */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="status-badge" style={{ background: statusColors[property.reviewStatus] ?? 'var(--concrete)', color: '#fff', margin: 0 }}>
                {property.reviewStatus}
              </span>
              <span className="chip" style={{ margin: 0 }}>{property.propertyType}</span>
              <span className="chip" style={{ margin: 0 }}>{property.listingType}</span>
              {property.bhk && <span className="chip" style={{ margin: 0 }}>{property.bhk} BHK</span>}
            </div>

            <DetailRow label="Title"       value={property.title} />
            <DetailRow label="Price"       value={property.priceLabel} highlight />
            <DetailRow label="Location"    value={`${property.locality}, ${property.city}`} />
            {property.address    && <DetailRow label="Address"     value={property.address} />}
            {property.reraNumber && <DetailRow label="RERA No."    value={property.reraNumber} />}
            <DetailRow label="Status"      value={property.status} />
            {property.furnishing && <DetailRow label="Furnishing"  value={property.furnishing} />}
            {property.description && <DetailRow label="Description" value={property.description} />}
            {property.areaSqft > 0 && <DetailRow label="Area (sq ft)" value={String(property.areaSqft)} />}
            {(property.lat || property.lng) && (
              <DetailRow label="GPS" value={`${property.lat?.toFixed(5)}, ${property.lng?.toFixed(5)}`} />
            )}

            {/* Gallery */}
            {property.images?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Photos
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {property.images.map(id => (
                    <img
                      key={id}
                      src={img.thumb(id)}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--sand)' }}
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            )}

            {property.floorPlanUrl && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Floor Plan
                </div>
                <img
                  src={img.thumb(property.floorPlanUrl)}
                  alt="Floor Plan"
                  style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--sand)' }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {mode === 'edit' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            <div className="form-field">
              <label className="label">Title *</label>
              <input type="text" className="form-input" required value={form.title}
                onChange={e => update({ title: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Property Type</label>
              <div className="chip-group">
                {PROPERTY_TYPES.map(type => (
                  <button key={type} type="button" className={`chip ${form.propertyType === type ? 'active' : ''}`}
                    onClick={() => update({ propertyType: type })}>{type}</button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="label">Listing Type</label>
              <div className="chip-group">
                {LISTING_TYPES.map(type => (
                  <button key={type} type="button" className={`chip ${form.listingType === type ? 'active' : ''}`}
                    onClick={() => update({ listingType: type })}>{type}</button>
                ))}
              </div>
            </div>

            {form.propertyType !== 'Plot' && form.propertyType !== 'Commercial' && (
              <div className="form-field">
                <label className="label">BHK</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button type="button" className="chip" onClick={() => update({ bhk: Math.max(1, form.bhk - 1) })} disabled={form.bhk <= 1}>-</button>
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, minWidth: '2rem', textAlign: 'center' }}>{form.bhk}</span>
                  <button type="button" className="chip" onClick={() => update({ bhk: Math.min(10, form.bhk + 1) })} disabled={form.bhk >= 10}>+</button>
                </div>
              </div>
            )}

            <div className="form-field">
              <label className="label">Price (INR) *</label>
              <input type="number" className="form-input" required value={form.priceInr}
                onChange={e => update({ priceInr: e.target.value })} />
              {form.priceInr && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ochre)' }}>
                  Auto-label: {formatPriceLabel(parseInt(form.priceInr) || 0)}
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="label">Locality *</label>
              <input type="text" className="form-input" required value={form.locality}
                onChange={e => update({ locality: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">City *</label>
              <input type="text" className="form-input" required value={form.city}
                onChange={e => update({ city: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Full Address</label>
              <textarea className="form-textarea" value={form.address}
                onChange={e => update({ address: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">RERA Number</label>
              <input type="text" className="form-input" value={form.reraNumber}
                onChange={e => update({ reraNumber: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Status</label>
              <div className="chip-group">
                {PROPERTY_STATUSES.map(s => (
                  <button key={s} type="button" className={`chip ${form.status === s ? 'active' : ''}`}
                    onClick={() => update({ status: s })}>{s}</button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="label">Furnishing</label>
              <div className="chip-group">
                {FURNISHING_TYPES.map(type => (
                  <button key={type} type="button" className={`chip ${form.furnishing === type ? 'active' : ''}`}
                    onClick={() => update({ furnishing: type })}>{type}</button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="label">Description</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e => update({ description: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Location Coords (GPS)</label>
              <LocationPicker lat={form.lat} lng={form.lng}
                onChange={(lat, lng) => update({ lat, lng })} />
            </div>

            {/* Existing images with remove button */}
            {form.images.length > 0 && (
              <div className="form-field">
                <label className="label">Current Photos</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {form.images.map(id => (
                    <div key={id} style={{ position: 'relative' }}>
                      <img src={img.thumb(id)} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--sand)' }} />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(id)}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 20, height: 20, borderRadius: '50%',
                          background: '#c0392b', color: '#fff', border: 'none',
                          fontSize: '0.7rem', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                        }}
                        aria-label="Remove photo"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-field" style={{ marginTop: '0.5rem' }}>
              <label className="label" style={{ marginBottom: '0.5rem' }}>Add More Photos</label>
              <PhotoUploader scope="prop-edit-images" folder="properties" label="Add Photos" />
            </div>

            {/* Existing floor plan */}
            {form.floorPlanUrl && (
              <div className="form-field">
                <label className="label">Current Floor Plan</label>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={img.thumb(form.floorPlanUrl)} alt="Floor Plan" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={() => update({ floorPlanUrl: '' })}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#c0392b', color: '#fff', border: 'none',
                      fontSize: '0.7rem', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    }}
                    aria-label="Remove floor plan"
                  >✕</button>
                </div>
              </div>
            )}

            <div className="form-field" style={{ marginTop: '0.5rem' }}>
              <label className="label" style={{ marginBottom: '0.5rem' }}>
                {form.floorPlanUrl ? 'Replace Floor Plan' : 'Add Floor Plan'}
              </label>
              <PhotoUploader scope="prop-edit-floor" folder="properties" label="Add Floor Plan" maxPhotos={1} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', padding: '1.25rem 0 0', borderTop: '1px solid var(--sand)' }}>
              <button type="button" className="btn-primary" style={{ background: 'var(--sand)', color: 'var(--ink)', flex: 1 }}
                onClick={() => { setMode('view'); setError(null) }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-ochre" style={{ flex: 1 }} disabled={saving || isUploading}>
                {saving ? 'Saving…' : (isUploading ? 'Uploading…' : 'Save Changes')}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

// ── Small helper ──────────────────────────────────────────────────────────────
function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', alignItems: 'start' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '0.1rem' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.95rem', fontWeight: highlight ? 700 : 400, color: highlight ? 'var(--ochre)' : 'inherit', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}
