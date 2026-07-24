import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useState } from 'react'
import { generateUUID } from '@carry/logic'
import { img } from '@carry/shared'
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
    // An existing record's `value` is a bare Cloudinary publicId, not a URL —
    // needs img.thumb() to render. A `__queued__:` placeholder from an earlier
    // session has no displayable source; fall back to the raw string as before.
    const displayUri = localUri ?? (value && !value.startsWith('__queued__:') ? img.thumb(value) : value) ?? ''
    return (
      <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
        <Image
          source={{ uri: displayUri }}
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
