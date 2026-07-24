import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { generateUUID } from '@carry/logic'
import { img } from '@carry/shared'
import { pickFromGallery, takePhoto } from '../lib/photoPicker'
import { compressImage } from '../lib/compress'
import { enqueueUpload } from '../lib/uploadQueue'
import { colors } from '../theme/colors'

interface PhotoPickerProps {
  /** The model type (used to set folder name in Cloudinary) */
  model:      'property' | 'labour' | 'shop'
  /** The temp record ID for this form session */
  recordId:   string
  /** Field name — 'images', 'floorPlanUrl', 'profilePhotoUrl' */
  fieldName:  string
  /** Folder name in Cloudinary */
  folder:     string
  /** Max number of photos (default 10) */
  maxCount?:  number
  /** Called with array of local IDs (either publicId or __queued__:localId) */
  onChange:   (localIds: string[]) => void
  /** Current value */
  value:      string[]
}

type PhotoEntry = {
  localId:   string       // UUID
  fileUri:   string       // local file:// path
  status:    'compressing' | 'queued' | 'uploading' | 'done' | 'failed'
  publicId?: string
}

export function PhotoPicker({
  model, recordId, fieldName, folder, maxCount = 10, onChange, value,
}: PhotoPickerProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  // Already-uploaded photos from a record being edited — distinct from `photos`
  // state above, which only tracks images picked during this session.
  const existingImages = value.filter(v => !v.startsWith('__queued__:'))
  const totalCount = existingImages.length + photos.length

  const removeExisting = (publicId: string) => {
    onChange(value.filter(v => v !== publicId))
  }

  const addPhotos = async (uris: string[]) => {
    if (totalCount + uris.length > maxCount) {
      Alert.alert('Too many photos', `Maximum ${maxCount} photos allowed.`)
      return
    }

    const newEntries: PhotoEntry[] = uris.map(uri => ({
      localId: generateUUID(),
      fileUri: uri,
      status:  'compressing',
    }))

    setPhotos(prev => {
      const next = [...prev, ...newEntries]
      return next
    })

    // Accumulated locally rather than read from the `value` prop on each
    // iteration — `value` is captured once when addPhotos starts and never
    // reflects this batch's own earlier onChange calls, so a multi-select
    // batch would otherwise overwrite itself down to just the last photo.
    const queuedIds: string[] = []

    for (const entry of newEntries) {
      try {
        // Compress
        const compressedUri = await compressImage(entry.fileUri)

        // Queue for upload — will be picked up by flushPendingUploads
        enqueueUpload({
          localId:   entry.localId,
          model,
          recordId,
          fieldName,
          fileUri:   compressedUri,
          fileName:  `${entry.localId}.jpg`,
          folder,
        })

        setPhotos(prev =>
          prev.map(p =>
            p.localId === entry.localId
              ? { ...p, fileUri: compressedUri, status: 'queued' }
              : p
          )
        )

        // Notify parent with __queued__: prefix so form knows to resolve later
        queuedIds.push(`__queued__:${entry.localId}`)
        onChange([...value, ...queuedIds])
      } catch {
        setPhotos(prev =>
          prev.map(p => p.localId === entry.localId ? { ...p, status: 'failed' } : p)
        )
      }
    }
  }

  const handleGallery = async () => {
    const uris = await pickFromGallery(true)
    if (uris.length > 0) await addPhotos(uris)
  }

  const handleCamera = async () => {
    const uri = await takePhoto()
    if (uri) await addPhotos([uri])
  }

  const removePhoto = (localId: string) => {
    setPhotos(prev => prev.filter(p => p.localId !== localId))
    onChange(value.filter(v => v !== `__queued__:${localId}`))
  }

  return (
    <View>
      {/* Photo Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {existingImages.map(publicId => (
          <View key={publicId} style={styles.photoThumb}>
            <Image source={{ uri: img.thumb(publicId) }} style={styles.thumbImage} />
            <TouchableOpacity
              onPress={() => removeExisting(publicId)}
              style={styles.removeBtn}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.map(photo => (
          <View key={photo.localId} style={styles.photoThumb}>
            <Image
              source={{ uri: photo.fileUri }}
              style={styles.thumbImage}
            />
            {photo.status === 'compressing' && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            )}
            {photo.status === 'queued' && (
              <View style={[styles.thumbOverlay, { backgroundColor: 'rgba(200,134,26,0.5)' }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>QUEUED</Text>
              </View>
            )}
            {photo.status === 'failed' && (
              <View style={[styles.thumbOverlay, { backgroundColor: 'rgba(192,57,43,0.7)' }]}>
                <Text style={{ color: '#fff', fontSize: 10 }}>FAILED</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => removePhoto(photo.localId)}
              style={styles.removeBtn}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      {totalCount < maxCount && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.addBtn} onPress={handleCamera}>
            <Text style={styles.addBtnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleGallery}>
            <Text style={styles.addBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 6 }}>
        {totalCount}/{maxCount} photos · Photos save locally and upload when online
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  photoThumb: {
    width:        80,
    height:       80,
    borderRadius: 8,
    marginRight:  8,
    overflow:     'hidden',
    position:     'relative',
  },
  thumbImage: {
    width:  '100%',
    height: '100%',
  },
  thumbOverlay: {
    position:        'absolute',
    left:            0,
    right:           0,
    top:             0,
    bottom:          0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  removeBtn: {
    position:        'absolute',
    top:             2,
    right:           2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius:    10,
    width:           20,
    height:          20,
    alignItems:      'center',
    justifyContent:  'center',
  },
  addBtn: {
    flex:            1,
    borderWidth:     1.5,
    borderColor:     '#C8861A',
    borderRadius:    10,
    padding:         12,
    alignItems:      'center',
    borderStyle:     'dashed',
  },
  addBtnText: {
    fontSize:   13,
    color:      '#C8861A',
    fontWeight: '600',
  },
})
