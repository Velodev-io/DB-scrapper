/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matches the web app's CSS tokens exactly
        paper:    '#FDFAF6',
        ink:      '#1a1510',
        ochre:    '#C8861A',
        concrete: '#8c8580',
        sand:     '#E8E0D8',
        steel:    '#2E3A40',
        error:    '#C0392B',
        success:  '#27AE60',
        warning:  '#E67E22',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        bold: ['Inter_700Bold'],
        mono: ['IBMPlexMono_400Regular'],
      },
    },
  },
}
