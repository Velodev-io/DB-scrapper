import { api } from '@carry/shared'
import {
  getPendingUploads, markUploadComplete, incrementUploadAttempts, deleteUpload,
  getPendingRecords, deletePendingRecord, isRecordPending, getUploadByLocalId,
} from './uploadQueue'
import { uploadFileToCloudinary } from './cloudinaryUpload'

const MAX_ATTEMPTS = 5
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:4001/api/v1'

// ── Flush photo uploads ───────────────────────────────────────────────────────

export async function flushPendingUploads(token: string): Promise<void> {
  const pending = getPendingUploads()

  for (const upload of pending) {
    if (upload.attempts >= MAX_ATTEMPTS) continue
    // Skip uploads whose parent record hasn't been submitted yet — those are
    // handled in flushPendingRecords (no server-side record exists to PATCH).
    if (isRecordPending(upload.recordId)) continue

    try {
      const publicId = await uploadFileToCloudinary(
        upload.fileUri, upload.fileName, upload.folder, token
      )
      // Patch the real DB record to update the publicId
      await api.patch(
        `/uploads/patch-queued`,
        {
          model:     upload.model,
          recordId:  upload.recordId,
          fieldName: upload.fieldName,
          publicId,
        },
        token
      )
      markUploadComplete(upload.localId, publicId)
    } catch {
      incrementUploadAttempts(upload.id)
    }
  }
}

// ── Flush pending records ─────────────────────────────────────────────────────

export async function flushPendingRecords(token: string): Promise<void> {
  const pendingUploads = getPendingUploads()
  const pendingRecords = getPendingRecords()

  // Step 1: Upload photo files for still-offline (not-yet-submitted) records first —
  // no server-side record exists yet, so just upload + mark complete; the record's
  // own POST payload below carries the resolved publicId (no PATCH needed here).
  for (const upload of pendingUploads) {
    if (!isRecordPending(upload.recordId)) continue
    if (upload.publicId || upload.attempts >= MAX_ATTEMPTS) continue

    try {
      const publicId = await uploadFileToCloudinary(
        upload.fileUri, upload.fileName, upload.folder, token
      )
      markUploadComplete(upload.localId, publicId)
    } catch {
      incrementUploadAttempts(upload.id)
    }
  }

  // Step 2: Submit records whose photos are all uploaded
  for (const record of pendingRecords) {
    try {
      const payload = { ...record.payload }
      let allReady = true

      // Resolve __queued__: localIds → real Cloudinary publicIds. Looked up
      // individually (not via getPendingUploads()) because that query
      // filters to public_id IS NULL — an upload just completed in Step 1
      // above would already be excluded from it.
      const resolveId = (localId: string): string | null => {
        const cleanId = String(localId).replace('__queued__:', '')
        const u = getUploadByLocalId(cleanId)
        return u?.publicId ?? null
      }

      if (record.type === 'property') {
        const images: string[] = []
        for (const id of (payload.images as string[] ?? [])) {
          const resolved = resolveId(id)
          if (!resolved) { allReady = false; break }
          images.push(resolved)
        }
        if (!allReady) continue
        payload.images = images

        if (payload.floorPlanUrl && String(payload.floorPlanUrl).startsWith('__queued__:')) {
          const resolved = resolveId(String(payload.floorPlanUrl))
          if (!resolved) continue
          payload.floorPlanUrl = resolved
        }
      }

      if (record.type === 'labour' && payload.profilePhotoUrl) {
        if (String(payload.profilePhotoUrl).startsWith('__queued__:')) {
          const resolved = resolveId(String(payload.profilePhotoUrl))
          if (!resolved) continue
          payload.profilePhotoUrl = resolved
        }
      }

      if (record.type === 'shop') {
        const images: string[] = []
        for (const id of (payload.images as string[] ?? [])) {
          const resolved = resolveId(id)
          if (!resolved) { allReady = false; break }
          images.push(resolved)
        }
        if (!allReady) continue
        payload.images = images
      }

      const endpoint = record.type === 'property' ? '/properties'
                     : record.type === 'shop'     ? '/shops'
                     : '/labour'

      await api.post(`${BASE_URL}${endpoint}`, payload, token)

      // Clean up associated uploads
      const localIds = [
        ...(record.payload.images as string[] ?? []),
        record.payload.floorPlanUrl as string,
        record.payload.profilePhotoUrl as string,
      ].filter(Boolean)

      for (const localId of localIds) {
        if (String(localId).startsWith('__queued__:')) {
          deleteUpload(String(localId).replace('__queued__:', ''))
        }
      }

      deletePendingRecord(record.id)
    } catch {
      // Will retry next sync cycle
    }
  }
}

// ── Full sync (used by both foreground + background runner) ───────────────────

export async function runFullSync(token: string): Promise<void> {
  await flushPendingUploads(token)
  await flushPendingRecords(token)
}
