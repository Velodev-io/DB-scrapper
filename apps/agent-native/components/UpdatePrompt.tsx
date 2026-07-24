import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { colors } from '../theme/colors'
import { type UpdateState } from '../lib/otaUpdates'

const { width } = Dimensions.get('window')

type Props = {
  state: UpdateState
  onUpdate: () => void
  onDismiss: () => void
}

/**
 * UpdatePrompt — slides up from the bottom when an OTA update is available.
 * Matches the app's paper/ochre design language.
 */
export function UpdatePrompt({ state, onUpdate, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(200)).current
  const opacity = useRef(new Animated.Value(0)).current

  const isVisible =
    state.status === 'available' ||
    state.status === 'downloading' ||
    state.status === 'ready'

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 200,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isVisible, translateY, opacity])

  if (!isVisible) return null

  const isDownloading = state.status === 'downloading' || state.status === 'ready'
  const message =
    state.status === 'available' ? state.message : 'Installing update...'

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />

      {/* Card */}
      <Animated.View style={[styles.card, { transform: [{ translateY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Text style={styles.icon}>↑</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Update Available</Text>
            <Text style={styles.subtitle}>Carry Field Ops</Text>
          </View>
          {!isDownloading && (
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Actions */}
        {isDownloading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.ochre} />
            <Text style={styles.loadingLabel}>
              {state.status === 'ready' ? 'Restarting...' : 'Downloading...'}
            </Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity onPress={onDismiss} style={styles.laterBtn}>
              <Text style={styles.laterLabel}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onUpdate} style={styles.updateBtn}>
              <Text style={styles.updateLabel}>Update Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 21, 16, 0.35)',
    zIndex: 1000,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.ochre,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.concrete,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 11,
    color: colors.concrete,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.sand,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: colors.steel,
    lineHeight: 21,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  laterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.concrete,
  },
  updateBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.ochre,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ochre,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingLabel: {
    fontSize: 14,
    color: colors.concrete,
    fontWeight: '500',
  },
})
