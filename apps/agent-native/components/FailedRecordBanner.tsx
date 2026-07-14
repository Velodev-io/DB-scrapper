import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'

interface FailedRecordBannerProps {
  count:    number
  onRetry:  () => void
}

/**
 * Shows when some records have exceeded MAX_ATTEMPTS and need manual retry.
 * This solves the silent permanent failure problem from the web app.
 */
export function FailedRecordBanner({ count, onRetry }: FailedRecordBannerProps) {
  if (count === 0) return null

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⚠️</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {count} record{count > 1 ? 's' : ''} failed to sync
        </Text>
        <Text style={styles.sub}>
          These records could not be submitted automatically.
        </Text>
      </View>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  icon: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700', color: colors.error },
  sub:   { fontSize: 11, color: '#7F1D1D', marginTop: 2 },
  retryBtn: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
