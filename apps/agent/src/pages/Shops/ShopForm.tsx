import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { api, SHOP_TYPES } from '@carry/shared'
import { useFormPersist } from '../../hooks/useFormPersist'
import { LocationPicker } from '../../components/LocationPicker'
import { enqueuePendingRecord } from '../../lib/uploadQueue'

interface FormState {
  shopName:    string
  shopType:    string
  keeperName:  string
  keeperPhone: string
  address:     string
  lat:         number | undefined
  lng:         number | undefined
}

const initialForm: FormState = {
  shopName:    '',
  shopType:    '',
  keeperName:  '',
  keeperPhone: '',
  address:     '',
  lat:         undefined,
  lng:         undefined,
}

export function ShopForm() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const storageKey = `carry:form:shop:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist<FormState>(storageKey, initialForm)

  // datalist id for shop type suggestions
  const datalistId = 'shop-type-suggestions'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)

    if (!form.shopName || !form.shopType || !form.keeperName || !form.keeperPhone) {
      setError('Please fill in all required fields.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      const recordId = crypto.randomUUID()

      const payload = {
        id:          recordId,
        shopName:    form.shopName,
        shopType:    form.shopType,
        keeperName:  form.keeperName,
        keeperPhone: form.keeperPhone,
        address:     form.address || null,
        lat:         form.lat ?? null,
        lng:         form.lng ?? null,
      }

      if (!navigator.onLine) {
        await enqueuePendingRecord({
          id:        `temp-${recordId}`,
          type:      'shop',
          payload,
          createdAt: Date.now(),
        })
        clear()
        navigate('/shops')
        return
      }

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      await api.post<{ id: string }>('/shops', payload, token)

      clear()
      navigate('/shops')
    } catch (err: any) {
      setError(err.message || 'Failed to submit shop record')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Submit Shop</h1>
      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>

        {/* ── Shop Details ─────────────────────────────────────────── */}
        <div className="form-field">
          <label className="label">Shop Name *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.shopName}
            onChange={(e) => update({ shopName: e.target.value })}
            placeholder="e.g. Sharma Cement Store"
          />
        </div>

        <div className="form-field">
          <label className="label">Shop Type *</label>
          <input
            type="text"
            list={datalistId}
            className="form-input"
            required
            value={form.shopType}
            onChange={(e) => update({ shopType: e.target.value })}
            placeholder="e.g. Cement, Bricks, Hardware…"
          />
          <datalist id={datalistId}>
            {SHOP_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        {/* ── Shopkeeper Details ───────────────────────────────────── */}
        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          Shopkeeper Details
        </h3>

        <div className="form-field">
          <label className="label">Shopkeeper Name *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.keeperName}
            onChange={(e) => update({ keeperName: e.target.value })}
            placeholder="e.g. Ramesh Sharma"
          />
        </div>

        <div className="form-field">
          <label className="label">Shopkeeper Phone *</label>
          <input
            type="tel"
            className="form-input"
            required
            value={form.keeperPhone}
            onChange={(e) => update({ keeperPhone: e.target.value })}
            placeholder="e.g. +91 9876543210"
          />
        </div>

        {/* ── Location ─────────────────────────────────────────────── */}
        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          Location
        </h3>

        <div className="form-field">
          <label className="label">Address</label>
          <input
            type="text"
            className="form-input"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="e.g. 12, MG Road, Bengaluru"
          />
        </div>

        <div className="form-field">
          <label className="label" style={{ marginBottom: '0.5rem' }}>GPS Coordinates</label>
          <LocationPicker
            lat={form.lat}
            lng={form.lng}
            onChange={(lat, lng) => update({ lat, lng })}
          />
        </div>

        <div className="submit-bar">
          <button
            type="submit"
            className="btn-primary btn-ochre"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Shop'}
          </button>
        </div>
      </form>
    </div>
  )
}
