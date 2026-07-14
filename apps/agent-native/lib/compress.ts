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
