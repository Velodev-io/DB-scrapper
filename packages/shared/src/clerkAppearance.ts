import type { Appearance } from '@clerk/types'

// Matches Carry Construction brand colours and fonts.
// Used in ClerkProvider appearance prop in both apps.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary:    '#B87333',   // Ochre
    colorBackground: '#F5F1E9',   // Bone
    colorText:       '#1C1B18',   // Ink
    colorInputBackground: '#E7E0D3', // Sand
    borderRadius:    '0.375rem',
    fontFamily:      "'Inter Variable', system-ui, sans-serif",
  },
  elements: {
    card:         'shadow-none border border-[#E7E0D3]',
    headerTitle:  "font-['Fraunces_Variable',serif] text-2xl",
    formButtonPrimary: 'bg-[#B87333] hover:bg-[#9a6128] text-white',
  },
}
