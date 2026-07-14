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
