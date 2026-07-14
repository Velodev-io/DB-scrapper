import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'

interface StatusBadgeProps {
  status: 'pending' | 'synced' | 'failed' | 'reviewed'
}

const CONFIG = {
  pending:  { bg: '#FEF3C7', text: '#92400E', label: 'Pending Sync' },
  synced:   { bg: '#D1FAE5', text: '#065F46', label: 'Synced' },
  failed:   { bg: '#FEE2E2', text: '#991B1B', label: 'Failed' },
  reviewed: { bg: '#DBEAFE', text: '#1E40AF', label: 'Reviewed' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = CONFIG[status]
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius:    12,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  text: { fontSize: 10, fontWeight: '700' },
})
