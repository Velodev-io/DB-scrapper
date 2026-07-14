# File 05 — Photo Upload System

> **Antigravity Instructions:**
> Build the complete native photo system: picker (camera + gallery), compression, and the PhotoPicker component used in all 3 forms.

---

## Task 1 — Image Compression Utility

Create file: `apps/agent-native/lib/compress.ts`

```ts
import * as ImageManipulator from 'expo-image-manipulator'

const MAX_WIDTH_PX  = 1080
const JPEG_QUALITY  = 0.75  // 75% quality — good balance for field photos

/**
 * compressImage — resizes to max 1080px width and compresses to JPEG.
 * Returns a new local file:// URI (the original is left untouched).
 */
export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH_PX } }],
    {
      compress: JPEG_QUALITY,
      format:   ImageManipulator.SaveFormat.JPEG,
    }
  )
  return result.uri
}

/**
 * compressImages — compress an array of file URIs in sequence.
 */
export async function compressImages(uris: string[]): Promise<string[]> {
  const results: string[] = []
  for (const uri of uris) {
    const compressed = await compressImage(uri)
    results.push(compressed)
  }
  return results
}
```

---

## Task 2 — Photo Picker Functions

Create file: `apps/agent-native/lib/photoPicker.ts`

```ts
import * as ImagePicker from 'expo-image-picker'

/**
 * requestPermissions — request camera and media library permissions.
 * Call once on app start or before first use.
 */
export async function requestPhotoPermissions(): Promise<boolean> {
  const camera  = await ImagePicker.requestCameraPermissionsAsync()
  const library = await ImagePicker.requestMediaLibraryPermissionsAsync()
  return camera.granted && library.granted
}

/**
 * pickFromGallery — opens the system photo picker.
 * Returns array of local file:// URIs.
 */
export async function pickFromGallery(multiple = true): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:             ['images'],
    allowsMultipleSelection: multiple,
    quality:                1,   // We compress ourselves
    exif:                   false,
  })
  if (result.canceled) return []
  return result.assets.map(a => a.uri)
}

/**
 * takePhoto — opens the camera.
 * Returns a single local file:// URI, or null if cancelled.
 */
export async function takePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality:    1,
    exif:       false,
  })
  if (result.canceled) return null
  return result.assets[0].uri
}
```

---

## Task 3 — PhotoPicker Component

Create file: `apps/agent-native/components/PhotoPicker.tsx`

```tsx
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native'
import { generateUUID } from '@carry/logic'
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

  const addPhotos = async (uris: string[]) => {
    if (photos.length + uris.length > maxCount) {
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
        onChange([...value, `__queued__:${entry.localId}`])
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
      {photos.length < maxCount && (
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
        {photos.length}/{maxCount} photos · Photos save locally and upload when online
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
    ...StyleSheet.absoluteFillObject,
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
```

---

## Task 4 — Single Photo Picker (for profile photo / floor plan)

Create file: `apps/agent-native/components/SinglePhotoPicker.tsx`

```tsx
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useState } from 'react'
import { generateUUID } from '@carry/logic'
import { pickFromGallery, takePhoto } from '../lib/photoPicker'
import { compressImage } from '../lib/compress'
import { enqueueUpload } from '../lib/uploadQueue'
import { colors } from '../theme/colors'

interface SinglePhotoPickerProps {
  model:     'property' | 'labour' | 'shop'
  recordId:  string
  fieldName: string
  folder:    string
  value:     string | null
  onChange:  (localId: string | null) => void
  placeholder?: string
}

export function SinglePhotoPicker({
  model, recordId, fieldName, folder, value, onChange, placeholder = 'Add Photo',
}: SinglePhotoPickerProps) {
  const [loading, setLoading] = useState(false)
  const [localUri, setLocalUri] = useState<string | null>(null)

  const pick = async (camera: boolean) => {
    setLoading(true)
    try {
      const uri = camera ? await takePhoto() : (await pickFromGallery(false))[0]
      if (!uri) return

      const compressed = await compressImage(uri)
      const localId = generateUUID()

      enqueueUpload({
        localId, model, recordId, fieldName,
        fileUri: compressed, fileName: `${localId}.jpg`, folder,
      })

      setLocalUri(compressed)
      onChange(`__queued__:${localId}`)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setLocalUri(null)
    onChange(null)
  }

  if (localUri || value) {
    return (
      <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
        <Image
          source={{ uri: localUri ?? value ?? '' }}
          style={{ width: 100, height: 100, borderRadius: 10 }}
        />
        <TouchableOpacity onPress={clear} style={styles.clearBtn}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TouchableOpacity style={styles.addBtn} onPress={() => pick(true)}>
        {loading
          ? <ActivityIndicator color={colors.ochre} />
          : <Text style={styles.addText}>📷 Camera</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.addBtn} onPress={() => pick(false)}>
        <Text style={styles.addText}>🖼️ Gallery</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  clearBtn: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#C8861A',
    borderRadius: 10, padding: 14, alignItems: 'center', borderStyle: 'dashed',
  },
  addText: { fontSize: 13, color: '#C8861A', fontWeight: '600' },
})
```

---

## Verifier + Decompose Protocol

After completing all tasks:

1. Run `verifier` — confirm no TypeScript errors in photo components or compression utils.
2. If verifier **passes** → immediately read and begin `06_property_screens.md`.
3. If verifier **fails** → run `decompose` to isolate and fix each error. Apply handoff. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/06_property_screens.md` and begin executing it immediately.**
