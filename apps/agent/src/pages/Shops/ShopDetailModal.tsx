import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Shop, SHOP_TYPES } from '@carry/shared'
import { LocationPicker } from '../../components/LocationPicker'
import { PhotoUploader } from '../../components/PhotoUploader/PhotoUploader'
import { uploadManager } from '../../lib/UploadManager'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'

interface Props {
  shop: Shop
  onClose: () => void
  onSaved: (updated: Shop) => void
}

export function ShopDetailModal({ shop, onClose, onSaved }: Props) {
  const { getToken } = useAuth()
  const { stats } = usePhotoUpload('shop-edit-images')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUploading = stats.uploading > 0 || stats.queued > 0

  const [form, setForm] = useState({
    shopName:    shop.shopName,
    shopType:    shop.shopType,
    keeperName:  shop.keeperName,
    keeperPhone: shop.keeperPhone,
    address:     shop.address ?? '',
    lat:         shop.lat as number | undefined,
    lng:         shop.lng as number | undefined,
    images:      [...(shop.images ?? [])],
  })

  const submittingRef = useRef(false)
  const datalistId = 'shop-type-suggestions'

  useEffect(() => {
    if (mode === 'edit') {
      uploadManager.clear('shop-edit-images')
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

    if (!form.shopName || !form.shopType || !form.keeperName || !form.keeperPhone) {
      setError('Please fill in all required fields.')
      return
    }

    submittingRef.current = true
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const newImageIds = uploadManager
        .getUploadedIds('shop-edit-images')
        .filter(id => !id.startsWith('__queued__:'))

      const payload = {
        shopName:    form.shopName,
        shopType:    form.shopType,
        keeperName:  form.keeperName,
        keeperPhone: form.keeperPhone,
        address:     form.address || null,
        lat:         form.lat ?? null,
        lng:         form.lng ?? null,
        images:      [...form.images, ...newImageIds],
      }

      const updated = await api.patch<Shop>(`/shops/${shop.id}/agent`, payload, token)
      uploadManager.clear('shop-edit-images')
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
            {mode === 'view' ? 'Shop Details' : 'Edit Shop'}
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
              <span className="status-badge" style={{ background: statusColors[shop.reviewStatus] ?? 'var(--concrete)', color: '#fff', margin: 0 }}>
                {shop.reviewStatus}
              </span>
              <span className="chip" style={{ margin: 0 }}>{shop.shopType}</span>
            </div>

            <DetailRow label="Shop Name"   value={shop.shopName} />
            <DetailRow label="Keeper Name" value={shop.keeperName} />
            <DetailRow label="Keeper Phone" value={shop.keeperPhone} highlight />
            {shop.address && <DetailRow label="Address" value={shop.address} />}
            {(shop.lat || shop.lng) && (
              <DetailRow label="GPS" value={`${shop.lat?.toFixed(5)}, ${shop.lng?.toFixed(5)}`} />
            )}

            {/* Gallery */}
            {shop.images && shop.images.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Photos
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {shop.images.map(id => (
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
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {mode === 'edit' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            <div className="form-field">
              <label className="label">Shop Name *</label>
              <input type="text" className="form-input" required value={form.shopName}
                onChange={e => update({ shopName: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Shop Type *</label>
              <input type="text" list={datalistId} className="form-input" required value={form.shopType}
                onChange={e => update({ shopType: e.target.value })} />
              <datalist id={datalistId}>
                {SHOP_TYPES.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
              Shopkeeper Details
            </h3>

            <div className="form-field">
              <label className="label">Shopkeeper Name *</label>
              <input type="text" className="form-input" required value={form.keeperName}
                onChange={e => update({ keeperName: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Shopkeeper Phone *</label>
              <input type="tel" className="form-input" required value={form.keeperPhone}
                onChange={e => update({ keeperPhone: e.target.value })} />
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
              Location
            </h3>

            <div className="form-field">
              <label className="label">Address</label>
              <input type="text" className="form-input" value={form.address}
                onChange={e => update({ address: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label" style={{ marginBottom: '0.5rem' }}>GPS Coordinates</label>
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
              <label className="label" style={{ marginBottom: '0.5rem' }}>Add More Photos (Max 5)</label>
              <PhotoUploader scope="shop-edit-images" folder="shops" label="Add Photos" maxPhotos={5 - form.images.length} />
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
