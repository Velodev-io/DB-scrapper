import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { formatCachedAt } from '../hooks/useOfflineList'
import { colors } from '../theme/colors'

interface StaleBannerProps {
  cachedAt:  number | null
  onRetry:   () => void
}

export function StaleBanner({ cachedAt, onRetry }: StaleBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>⚠️ Showing cached data</Text>
        {cachedAt && (
          <Text style={styles.sub}>Last synced: {formatCachedAt(cachedAt)}</Text>
        )}
      </View>
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  sub:   { fontSize: 11, color: '#92400E', opacity: 0.8, marginTop: 1 },
  retryBtn: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
