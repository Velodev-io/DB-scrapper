import { View, Text, StyleSheet } from 'react-native'
import type { ReactNode } from 'react'
import { colors } from '../theme/colors'

interface FormFieldProps {
  label:    string
  children: ReactNode
  hint?:    string
}

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: {
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color:         colors.concrete,
    marginBottom:  6,
  },
  hint: {
    fontSize:  11,
    color:     colors.concrete,
    marginTop: 4,
  },
})
