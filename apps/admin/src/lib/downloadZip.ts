import JSZip from 'jszip'
import { img } from '@carry/shared'

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return res.blob()
}

export async function downloadZip(
  title: string,
  sections: { folder: string; publicIds: string[] }[]
) {
  const zip = new JSZip()
  const slug = title.replace(/[^a-z0-9]/gi, '_').toLowerCase()

  for (const { folder, publicIds } of sections) {
    const dir = folder ? zip.folder(folder)! : zip
    await Promise.all(
      publicIds.map(async (id, i) => {
        const blob = await fetchBlob(img.full(id))
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        dir.file(`photo-${i + 1}.${ext}`, blob)
      })
    )
  }

  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `${slug}.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}
