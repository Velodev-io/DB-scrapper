// Canvas API image compression — zero dependencies, built into all browsers.
// Reduces a 6 MB phone photo to ~600 KB–1 MB before upload.

export interface CompressOptions {
  maxWidthPx?: number    // default: 1920
  quality?: number       // 0–1, default: 0.82 (JPEG)
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const { maxWidthPx = 1920, quality = 0.82 } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const scale  = Math.min(1, maxWidthPx / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
