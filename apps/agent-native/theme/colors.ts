export const colors = {
  paper:    '#FDFAF6',
  ink:      '#1a1510',
  ochre:    '#C8861A',
  concrete: '#8c8580',
  sand:     '#E8E0D8',
  steel:    '#2E3A40',
  error:    '#C0392B',
  success:  '#27AE60',
  warning:  '#E67E22',
} as const

export type ColorKey = keyof typeof colors
