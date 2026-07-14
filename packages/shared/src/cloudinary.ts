// All images are stored as Cloudinary public IDs in the DB.
// URLs are constructed here at read time using transformation parameters.
// This means changing quality/size settings requires no DB migration.

const getCloud = () =>
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME) ||
  (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ||
  'piwpzbke'

const base = () => `https://res.cloudinary.com/${getCloud()}/image/upload`

export const img = {
  // Tiny thumbnail for list views and table rows (fast on 3G)
  thumb: (publicId: string) =>
    `${base()}/w_200,h_200,c_fill,q_70,f_auto/${publicId}`,

  // Card image for property/project cards
  card: (publicId: string) =>
    `${base()}/w_800,q_auto,f_auto/${publicId}`,

  // Full-screen image for admin detail view
  full: (publicId: string) =>
    `${base()}/q_auto,f_auto/${publicId}`,

  // Forces browser to download at original quality (admin "Download" button)
  download: (publicId: string, filename: string) =>
    `${base()}/fl_attachment:${encodeURIComponent(filename)},q_100/${publicId}`,
}
