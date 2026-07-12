import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import {
  api,
  GENDERS,
  SKILL_TYPES
} from '@carry/shared'
import { useFormPersist } from '../../hooks/useFormPersist'
import { PhotoUploader } from '../../components/PhotoUploader/PhotoUploader'
import { uploadManager } from '../../lib/UploadManager'
import { enqueuePendingRecord, updateRecordId } from '../../lib/uploadQueue'
import { generateUUID } from '../../lib/uuid'

interface FormState {
  fullName: string
  age: string
  gender: string
  skillLevel: string
  skillType: string
  otherSkillType: string  // free-text when skillType === 'Other'
  phone: string
  houseNo: string
  street: string
  locality: string
  city: string
  pincode: string
}

const initialForm: FormState = {
  fullName: '',
  age: '',
  gender: 'Male',
  skillLevel: 'Non-Skilled',
  skillType: 'Mason / Bricklayer',
  otherSkillType: '',
  phone: '',
  houseNo: '',
  street: '',
  locality: '',
  city: '',
  pincode: '',
}

export function LabourForm() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const storageKey = `carry:form:labour:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist<FormState>(storageKey, initialForm)

  // Clear upload queues on mount to avoid bleeding
  useEffect(() => {
    uploadManager.clear('profilePhotoUrl')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)

    if (!form.fullName || !form.age || !form.phone) {
      setError('Please fill in all required fields.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      const recordId = generateUUID()
      const allProfilePhotoUrls = uploadManager.getUploadedIds('profilePhotoUrl')
      const queuedPhotoLocalId = allProfilePhotoUrls
        .find(id => id.startsWith('__queued__:'))
        ?.replace('__queued__:', '') ?? null

      const ageVal = parseInt(form.age)

      if (!navigator.onLine) {
        const tempId = `temp-${recordId}`

        if (queuedPhotoLocalId) {
          await updateRecordId(queuedPhotoLocalId, tempId)
        }

        // Resolve skillType: 'Other' → 'Other: <custom text>' so the DB stores meaningful data
        const resolvedSkillType = form.skillLevel === 'Skilled'
          ? (form.skillType === 'Other'
              ? (form.otherSkillType.trim() ? `Other: ${form.otherSkillType.trim()}` : 'Other')
              : form.skillType)
          : null

        await enqueuePendingRecord({
          id: tempId,
          type: 'labour',
          payload: {
            id: recordId,
            fullName: form.fullName,
            age: ageVal,
            gender: form.gender,
            skillLevel: form.skillLevel,
            skillType: resolvedSkillType,
            phone: form.phone,
            profilePhotoUrl: queuedPhotoLocalId, // bare UUID
            houseNo: form.houseNo || null,
            street: form.street || null,
            locality: form.locality || null,
            city: form.city || null,
            pincode: form.pincode || null,
          },
          createdAt: Date.now(),
        })

        clear()
        uploadManager.clear('profilePhotoUrl')
        navigate('/labour')
        return
      }

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const profilePhotoUrl = allProfilePhotoUrls.find(id => !id.startsWith('__queued__:')) ?? null

      // Resolve skillType: 'Other' → 'Other: <custom text>' so the DB stores meaningful data
      const resolvedSkillType = form.skillLevel === 'Skilled'
        ? (form.skillType === 'Other'
            ? (form.otherSkillType.trim() ? `Other: ${form.otherSkillType.trim()}` : 'Other')
            : form.skillType)
        : null

      const payload = {
        id: recordId,
        fullName: form.fullName,
        age: ageVal,
        gender: form.gender,
        skillLevel: form.skillLevel,
        skillType: resolvedSkillType,
        phone: form.phone,
        profilePhotoUrl,
        houseNo: form.houseNo || null,
        street: form.street || null,
        locality: form.locality || null,
        city: form.city || null,
        pincode: form.pincode || null,
      }

      const newLabour = await api.post<{ id: string }>('/labour', payload, token)
      if (queuedPhotoLocalId) {
        await updateRecordId(queuedPhotoLocalId, newLabour.id)
      }

      clear()
      uploadManager.clear('profilePhotoUrl')
      navigate('/labour')
    } catch (err: any) {
      setError(err.message || 'Failed to submit labour profile')
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
        <h1 className="page-title" style={{ marginBottom: 0 }}>Submit Labour</h1>
      </div>
      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="label">Full Name *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
            placeholder="e.g. Ramesh Kumar"
          />
        </div>

        <div className="form-field">
          <label className="label">Age *</label>
          <input
            type="number"
            className="form-input"
            required
            value={form.age}
            onChange={(e) => update({ age: e.target.value })}
            placeholder="e.g. 28"
          />
        </div>

        <div className="form-field">
          <label className="label">Gender</label>
          <div className="chip-group">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                className={`chip ${form.gender === g ? 'active' : ''}`}
                onClick={() => update({ gender: g })}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="label">Skill Level</label>
          <div className="chip-group">
            {['Skilled', 'Non-Skilled'].map((level) => (
              <button
                key={level}
                type="button"
                className={`chip ${form.skillLevel === level ? 'active' : ''}`}
                onClick={() => update({ skillLevel: level })}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {form.skillLevel === 'Skilled' && (
          <div className="form-field">
            <label className="label">Skill Type *</label>
            <select
              className="form-select"
              value={form.skillType}
              onChange={(e) => update({ skillType: e.target.value })}
            >
              {SKILL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {/* Free-text input revealed only when 'Other' is selected */}
            {form.skillType === 'Other' && (
              <input
                type="text"
                className="form-input"
                style={{ marginTop: '0.5rem' }}
                value={form.otherSkillType}
                onChange={(e) => update({ otherSkillType: e.target.value })}
                placeholder="Describe the skill (e.g. Scaffolding, Glass Fitter…)"
                required
              />
            )}
          </div>
        )}

        <div className="form-field">
          <label className="label">Phone Number *</label>
          <input
            type="tel"
            className="form-input"
            required
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="e.g. +91 9876543210"
          />
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          Availability Address
        </h3>

        <div className="form-field">
          <label className="label">House No / Flat</label>
          <input
            type="text"
            className="form-input"
            value={form.houseNo}
            onChange={(e) => update({ houseNo: e.target.value })}
            placeholder="e.g. #45, 2nd Floor"
          />
        </div>

        <div className="form-field">
          <label className="label">Street / Lane</label>
          <input
            type="text"
            className="form-input"
            value={form.street}
            onChange={(e) => update({ street: e.target.value })}
            placeholder="e.g. 5th Main Rd"
          />
        </div>

        <div className="form-field">
          <label className="label">Locality</label>
          <input
            type="text"
            className="form-input"
            value={form.locality}
            onChange={(e) => update({ locality: e.target.value })}
            placeholder="e.g. Whitefield"
          />
        </div>

        <div className="form-field">
          <label className="label">City</label>
          <input
            type="text"
            className="form-input"
            value={form.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="e.g. Bengaluru"
          />
        </div>

        <div className="form-field">
          <label className="label">Pincode</label>
          <input
            type="text"
            className="form-input"
            value={form.pincode}
            onChange={(e) => update({ pincode: e.target.value })}
            placeholder="e.g. 560066"
          />
        </div>

        <div className="form-field" style={{ marginTop: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>Profile Photo</label>
          <PhotoUploader scope="profilePhotoUrl" folder="labour" label="Add Profile Photo" maxPhotos={1} />
        </div>

        <div className="submit-bar">
          <button
            type="submit"
            className="btn-primary btn-ochre"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Labour'}
          </button>
        </div>
      </form>
    </div>
  )
}
