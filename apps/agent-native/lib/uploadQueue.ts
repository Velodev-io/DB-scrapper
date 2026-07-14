import { db } from './storage'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PendingUpload {
  id:        number
  localId:   string
  model:     string
  recordId:  string
  fieldName: string
  fileUri:   string    // local file:// URI on device
  fileName:  string
  folder:    string
  attempts:  number
  publicId:  string | null
}

export interface PendingRecord {
  id:        string
  type:      'property' | 'labour' | 'shop'
  payload:   Record<string, unknown>
  createdAt: number
}

// ── Upload Queue ─────────────────────────────────────────────────────────────

export function enqueueUpload(upload: Omit<PendingUpload, 'id' | 'attempts' | 'publicId'>): void {
  db.runSync(
    `INSERT OR IGNORE INTO pending_uploads
     (local_id, model, record_id, field_name, file_uri, file_name, folder)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [upload.localId, upload.model, upload.recordId, upload.fieldName,
     upload.fileUri, upload.fileName, upload.folder]
  )
}

export function getPendingUploads(): PendingUpload[] {
  return db.getAllSync<PendingUpload>(
    `SELECT id, local_id as localId, model, record_id as recordId,
            field_name as fieldName, file_uri as fileUri, file_name as fileName,
            folder, attempts, public_id as publicId
     FROM pending_uploads
     WHERE public_id IS NULL
     ORDER BY created_at ASC`
  )
}

// Looks up a single upload by localId regardless of completion state — used
// to resolve a just-uploaded photo's publicId. getPendingUploads() filters
// to public_id IS NULL, so it can never be used for this: the upload becomes
// invisible to that query the moment it completes, which is exactly when
// its publicId needs to be read.
export function getUploadByLocalId(localId: string): PendingUpload | null {
  return db.getFirstSync<PendingUpload>(
    `SELECT id, local_id as localId, model, record_id as recordId,
            field_name as fieldName, file_uri as fileUri, file_name as fileName,
            folder, attempts, public_id as publicId
     FROM pending_uploads
     WHERE local_id = ?`,
    [localId]
  ) ?? null
}

export function markUploadComplete(localId: string, publicId: string): void {
  db.runSync(
    `UPDATE pending_uploads SET public_id = ? WHERE local_id = ?`,
    [publicId, localId]
  )
}

export function incrementUploadAttempts(id: number): void {
  db.runSync(`UPDATE pending_uploads SET attempts = attempts + 1 WHERE id = ?`, [id])
}

export function deleteUpload(localId: string): void {
  db.runSync(`DELETE FROM pending_uploads WHERE local_id = ?`, [localId])
}

// ── Pending Records ───────────────────────────────────────────────────────────

export function enqueuePendingRecord(record: PendingRecord): void {
  db.runSync(
    `INSERT OR IGNORE INTO pending_records (id, type, payload, created_at)
     VALUES (?, ?, ?, ?)`,
    [record.id, record.type, JSON.stringify(record.payload), record.createdAt]
  )
}

export function getPendingRecords(): PendingRecord[] {
  return db.getAllSync<{ id: string; type: string; payload: string; created_at: number }>(
    `SELECT id, type, payload, created_at FROM pending_records ORDER BY created_at ASC`
  ).map(row => ({
    id:        row.id,
    type:      row.type as PendingRecord['type'],
    payload:   JSON.parse(row.payload),
    createdAt: row.created_at,
  }))
}

export function deletePendingRecord(id: string): void {
  db.runSync(`DELETE FROM pending_records WHERE id = ?`, [id])
}

export function getPendingCount(): number {
  const uploads = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_uploads WHERE public_id IS NULL`
  )
  const records = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_records`
  )
  return (uploads?.count ?? 0) + (records?.count ?? 0)
}

// True if this recordId belongs to a record that hasn't been submitted to the
// API yet (still sitting in the offline queue). Used to decide whether an
// upload's photo should be PATCHed onto an existing DB record, or just
// uploaded + marked complete so the record's own POST payload can carry it.
export function isRecordPending(recordId: string): boolean {
  return db.getFirstSync(`SELECT 1 FROM pending_records WHERE id = ?`, [recordId]) != null
}
