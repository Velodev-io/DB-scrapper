import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  api,
  img,
  type Labour,
  GENDERS,
  SKILL_TYPES,
} from '@carry/shared'
import { PhotoUploader } from '../../components/PhotoUploader/PhotoUploader'
import { uploadManager } from '../../lib/UploadManager'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'

interface Props {
  labour: Labour
  onClose: () => void
  onSaved: (updated: Labour) => void
}

export function LabourDetailModal({ labour, onClose, onSaved }: Props) {
  const { getToken } = useAuth()
  const { stats } = usePhotoUpload('labour-edit-profile')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUploading = stats.uploading > 0 || stats.queued > 0

  // Parse skillType if it was serialized as "Other: <custom text>"
  const initialSkillTypeIsOther = labour.skillType?.startsWith('Other:') || labour.skillType === 'Other'
  const initialOtherSkillType = initialSkillTypeIsOther
    ? (labour.skillType?.startsWith('Other: ') ? labour.skillType.substring(7) : '')
    : ''

  const [form, setForm] = useState({
    fullName:        labour.fullName,
    age:             String(labour.age),
    gender:          labour.gender as string,
    skillLevel:      labour.skillLevel as string,
    skillType:       initialSkillTypeIsOther ? 'Other' : (labour.skillType ?? 'Mason / Bricklayer'),
    otherSkillType:  initialOtherSkillType,
    phone:           labour.phone,
    houseNo:         labour.houseNo ?? '',
    street:          labour.street ?? '',
    locality:        labour.locality ?? '',
    city:            labour.city ?? '',
    pincode:         labour.pincode ?? '',
    profilePhotoUrl: labour.profilePhotoUrl ?? '',
  })

  const submittingRef = useRef(false)

  useEffect(() => {
    if (mode === 'edit') {
      uploadManager.clear('labour-edit-profile')
    }
  }, [mode])

  function update(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)

    if (!form.fullName || !form.age || !form.phone) {
      setError('Please fill in all required fields.')
      return
    }

    submittingRef.current = true
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const newProfilePhotoUrl = uploadManager
        .getUploadedIds('labour-edit-profile')
        .filter(id => !id.startsWith('__queued__:'))[0] ?? null

      const ageVal = parseInt(form.age)
      const resolvedSkillType = form.skillLevel === 'Skilled'
        ? (form.skillType === 'Other'
            ? (form.otherSkillType.trim() ? `Other: ${form.otherSkillType.trim()}` : 'Other')
            : form.skillType)
        : null

      const payload: Record<string, any> = {
        fullName:        form.fullName,
        age:             ageVal,
        gender:          form.gender,
        skillLevel:      form.skillLevel,
        skillType:       resolvedSkillType,
        phone:           form.phone,
        houseNo:         form.houseNo || null,
        street:          form.street || null,
        locality:        form.locality || null,
        city:            form.city || null,
        pincode:         form.pincode || null,
        profilePhotoUrl: newProfilePhotoUrl ?? (form.profilePhotoUrl || null),
      }

      const updated = await api.patch<Labour>(`/labour/${labour.id}/agent`, payload, token)
      uploadManager.clear('labour-edit-profile')
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
            {mode === 'view' ? 'Labour Details' : 'Edit Labour Profile'}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {mode === 'view' && (
              <button
                type="button"
                className="chip active"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', minHeight: 'auto', height: '32px' }}
                onClick={() => setMode('edit')}
              >
                ✏️ Edit
              </button>
            )}
            <button
              type="button"
              className="chip"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', minHeight: 'auto', height: '32px' }}
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
            {/* Status badge & basics */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="status-badge" style={{ background: statusColors[labour.reviewStatus] ?? 'var(--concrete)', color: '#fff', margin: 0 }}>
                {labour.reviewStatus}
              </span>
              <span className="chip" style={{ margin: 0, minHeight: 'auto', padding: '0.25rem 0.6rem', height: 'auto', fontSize: '0.75rem' }}>{labour.skillLevel}</span>
              {labour.skillType && <span className="chip" style={{ margin: 0, minHeight: 'auto', padding: '0.25rem 0.6rem', height: 'auto', fontSize: '0.75rem' }}>{labour.skillType}</span>}
              <span className="chip" style={{ margin: 0, minHeight: 'auto', padding: '0.25rem 0.6rem', height: 'auto', fontSize: '0.75rem' }}>{labour.gender}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {labour.profilePhotoUrl ? (
                <img
                  src={img.thumb(labour.profilePhotoUrl)}
                  alt={labour.fullName}
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--sand)', flexShrink: 0 }}
                  loading="lazy"
                />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', flexShrink: 0 }}>
                  👷
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labour.fullName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--concrete)', fontFamily: 'var(--font-mono)' }}>{labour.age} years • {labour.gender}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ochre)' }}>{labour.phone}</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--sand)', margin: '0.5rem 0' }} />

            <h4 style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', textTransform: 'uppercase' }}>Availability Address</h4>
            <DetailRow label="House/Flat" value={labour.houseNo ?? 'N/A'} />
            <DetailRow label="Street"     value={labour.street ?? 'N/A'} />
            <DetailRow label="Locality"   value={labour.locality ?? 'N/A'} />
            <DetailRow label="City"       value={labour.city ?? 'N/A'} />
            <DetailRow label="Pincode"    value={labour.pincode ?? 'N/A'} />
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {mode === 'edit' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            <div className="form-field">
              <label className="label">Full Name *</label>
              <input type="text" className="form-input" required value={form.fullName}
                onChange={e => update({ fullName: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Age *</label>
              <input type="number" className="form-input" required value={form.age}
                onChange={e => update({ age: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Gender</label>
              <div className="chip-group">
                {GENDERS.map(g => (
                  <button key={g} type="button" className={`chip ${form.gender === g ? 'active' : ''}`}
                    onClick={() => update({ gender: g })}>{g}</button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="label">Skill Level</label>
              <div className="chip-group">
                {['Skilled', 'Non-Skilled'].map(level => (
                  <button key={level} type="button" className={`chip ${form.skillLevel === level ? 'active' : ''}`}
                    onClick={() => update({ skillLevel: level })}>{level}</button>
                ))}
              </div>
            </div>

            {form.skillLevel === 'Skilled' && (
              <div className="form-field">
                <label className="label">Skill Type *</label>
                <select className="form-select" value={form.skillType}
                  onChange={e => update({ skillType: e.target.value })}>
                  {SKILL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {form.skillType === 'Other' && (
                  <input type="text" className="form-input" style={{ marginTop: '0.5rem' }} required
                    value={form.otherSkillType} onChange={e => update({ otherSkillType: e.target.value })}
                    placeholder="Describe the skill..." />
                )}
              </div>
            )}

            <div className="form-field">
              <label className="label">Phone Number *</label>
              <input type="tel" className="form-input" required value={form.phone}
                onChange={e => update({ phone: e.target.value })} />
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
              Availability Address
            </h3>

            <div className="form-field">
              <label className="label">House No / Flat</label>
              <input type="text" className="form-input" value={form.houseNo}
                onChange={e => update({ houseNo: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Street / Lane</label>
              <input type="text" className="form-input" value={form.street}
                onChange={e => update({ street: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Locality</label>
              <input type="text" className="form-input" value={form.locality}
                onChange={e => update({ locality: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">City</label>
              <input type="text" className="form-input" value={form.city}
                onChange={e => update({ city: e.target.value })} />
            </div>

            <div className="form-field">
              <label className="label">Pincode</label>
              <input type="text" className="form-input" value={form.pincode}
                onChange={e => update({ pincode: e.target.value })} />
            </div>

            {/* Existing profile photo */}
            {form.profilePhotoUrl ? (
              <div className="form-field">
                <label className="label">Current Profile Photo</label>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={img.thumb(form.profilePhotoUrl)} alt="Profile Photo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%' }} />
                  <button
                    type="button"
                    onClick={() => update({ profilePhotoUrl: '' })}
                    style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#c0392b', color: '#fff', border: 'none',
                      fontSize: '0.7rem', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    }}
                    aria-label="Remove photo"
                  >✕</button>
                </div>
              </div>
            ) : (
              <div className="form-field" style={{ marginTop: '0.5rem' }}>
                <label className="label" style={{ marginBottom: '0.5rem' }}>
                  Add Profile Photo
                </label>
                <PhotoUploader scope="labour-edit-profile" folder="labour" label="Add Profile Photo" maxPhotos={1} />
              </div>
            )}

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
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '0.5rem', alignItems: 'start' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '0.1rem' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.95rem', fontWeight: highlight ? 700 : 400, color: highlight ? 'var(--ochre)' : 'inherit', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}
