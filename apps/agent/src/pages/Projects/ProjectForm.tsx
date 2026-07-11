import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import {
  api,
  PROJECT_CATEGORIES,
  PACKAGE_TIERS
} from '@carry/shared'
import { useFormPersist } from '../../hooks/useFormPersist'
import { PhotoUploader } from '../../components/PhotoUploader/PhotoUploader'
import { uploadManager } from '../../lib/UploadManager'

interface FormState {
  title: string
  category: string
  location: string
  areaSqft: string
  durationMonths: string
  packageTier: string
  description: string
}

const initialForm: FormState = {
  title: '',
  category: 'Turnkey Villa',
  location: '',
  areaSqft: '',
  durationMonths: '',
  packageTier: 'Basic',
  description: '',
}

export function ProjectForm() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const storageKey = `carry:form:project:${user?.id ?? 'guest'}`
  const { form, update, clear } = useFormPersist<FormState>(storageKey, initialForm)

  // Clear upload queues on mount to avoid bleeding
  useEffect(() => {
    uploadManager.clear('beforeImages')
    uploadManager.clear('afterImages')
    uploadManager.clear('stageImages')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.title || !form.location) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmitting(true)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const beforeImages = uploadManager.getUploadedIds('beforeImages')
      const afterImages = uploadManager.getUploadedIds('afterImages')
      const stageImages = uploadManager.getUploadedIds('stageImages')

      const areaVal = form.areaSqft ? parseInt(form.areaSqft) : null
      const durationVal = form.durationMonths ? parseInt(form.durationMonths) : null

      const payload = {
        title: form.title,
        category: form.category,
        location: form.location,
        areaSqft: areaVal,
        durationMonths: durationVal,
        packageTier: form.packageTier || null,
        description: form.description || null,
        beforeImages,
        afterImages,
        stageImages,
      }

      await api.post('/projects', payload, token)
      clear()
      uploadManager.clear('beforeImages')
      uploadManager.clear('afterImages')
      uploadManager.clear('stageImages')
      navigate('/projects')
    } catch (err: any) {
      setError(err.message || 'Failed to submit construction project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Submit Project</h1>
      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="label">Project Title *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. Whitefield Villa Construction"
          />
        </div>

        <div className="form-field">
          <label className="label">Category</label>
          <div className="chip-group">
            {PROJECT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${form.category === cat ? 'active' : ''}`}
                onClick={() => update({ category: cat })}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="label">Location (Address/Area) *</label>
          <input
            type="text"
            className="form-input"
            required
            value={form.location}
            onChange={(e) => update({ location: e.target.value })}
            placeholder="e.g. Whitefield, Bengaluru"
          />
        </div>

        <div className="form-field">
          <label className="label">Area (Sqft)</label>
          <input
            type="number"
            className="form-input"
            value={form.areaSqft}
            onChange={(e) => update({ areaSqft: e.target.value })}
            placeholder="e.g. 2400 (optional)"
          />
        </div>

        <div className="form-field">
          <label className="label">Duration (Months)</label>
          <input
            type="number"
            className="form-input"
            value={form.durationMonths}
            onChange={(e) => update({ durationMonths: e.target.value })}
            placeholder="e.g. 12 (optional)"
          />
        </div>

        <div className="form-field">
          <label className="label">Package Tier</label>
          <div className="chip-group">
            {PACKAGE_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                className={`chip ${form.packageTier === tier ? 'active' : ''}`}
                onClick={() => update({ packageTier: tier })}
              >
                {tier}
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
            placeholder="Describe the project scope and specifications..."
          />
        </div>

        <div className="form-field" style={{ marginTop: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>Before Images</label>
          <PhotoUploader scope="beforeImages" folder="projects" label="Add Before Images" />
        </div>

        <div className="form-field" style={{ marginTop: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>Stage/Ongoing Images</label>
          <PhotoUploader scope="stageImages" folder="projects" label="Add Progress Images" />
        </div>

        <div className="form-field" style={{ marginTop: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>After/Finished Images</label>
          <PhotoUploader scope="afterImages" folder="projects" label="Add Finished Images" />
        </div>

        <div className="submit-bar">
          <button
            type="submit"
            className="btn-primary btn-ochre"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
