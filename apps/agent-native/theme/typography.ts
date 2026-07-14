import { StyleSheet } from 'react-native'
import { colors } from './colors'

export const typography = StyleSheet.create({
  pageTitle: {
    fontSize:   22,
    fontWeight: '700',
    color:      colors.ink,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color:         colors.concrete,
    marginBottom:  4,
  },
  body: {
    fontSize:   14,
    color:      colors.ink,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color:    colors.concrete,
  },
  price: {
    fontSize:   14,
    fontWeight: '600',
    color:      colors.ochre,
  },
})
