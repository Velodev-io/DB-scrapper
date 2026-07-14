# File 09 — Shared Components

> **Antigravity Instructions:**
> Build all reusable React Native UI components. These are used across all screens. Build them all in this file before proceeding.

---

## Task 1 — StaleBanner

Create file: `apps/agent-native/components/StaleBanner.tsx`

```tsx
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
```

---

## Task 2 — NetworkBanner (full implementation — replaces placeholder)

Replace `apps/agent-native/components/NetworkBanner.tsx` entirely:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { useAuth } from '@clerk/clerk-expo'
import { runFullSync } from '../lib/sync'
import { getPendingCount } from '../lib/uploadQueue'
import { persistToken } from '../lib/auth'
import { colors } from '../theme/colors'

type BannerStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'partial'

export function NetworkBanner() {
  const { getToken, isSignedIn } = useAuth()
  const [status, setStatus] = useState<BannerStatus>('online')
  const [pendingCount, setPendingCount] = useState(0)
  const opacity = useRef(new Animated.Value(0)).current
  const wasOffline = useRef(false)

  // Show / hide banner
  const show = useCallback(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
  }, [opacity])

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start()
  }, [opacity])

  const sync = useCallback(async () => {
    if (!isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      await persistToken(token)
      setStatus('syncing')
      show()
      await runFullSync(token)
      const remaining = getPendingCount()
      setStatus(remaining === 0 ? 'synced' : 'partial')
      setPendingCount(remaining)
      setTimeout(hide, 3000)
    } catch {
      setStatus('partial')
    }
  }, [isSignedIn, getToken, show, hide])

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable)
      if (!isOnline) {
        wasOffline.current = true
        setStatus('offline')
        show()
      } else {
        if (wasOffline.current) {
          wasOffline.current = false
          sync()
        } else {
          hide()
        }
      }
    })
    return unsubscribe
  }, [sync, show, hide])

  const config: Record<BannerStatus, { bg: string; text: string; label: string }> = {
    online:  { bg: colors.success,  text: '#fff', label: '✓ Back online' },
    offline: { bg: '#374151',       text: '#fff', label: '📵 No internet — working offline' },
    syncing: { bg: colors.ochre,    text: '#fff', label: '⟳ Syncing your records...' },
    synced:  { bg: colors.success,  text: '#fff', label: '✅ All records synced!' },
    partial: { bg: colors.warning,  text: '#fff', label: `⚠️ ${pendingCount} record${pendingCount !== 1 ? 's' : ''} still pending` },
  }

  return (
    <Animated.View style={[styles.banner, { backgroundColor: config[status].bg, opacity }]}>
      <Text style={[styles.text, { color: config[status].text }]}>
        {config[status].label}
      </Text>
      {status === 'partial' && (
        <TouchableOpacity onPress={sync} style={styles.retryBtn}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 999,
    paddingTop: 44,  // safe area
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { fontSize: 13, fontWeight: '600' },
  retryBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
})
```

---

## Task 3 — StatusBadge

Create file: `apps/agent-native/components/StatusBadge.tsx`

```tsx
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
```

---

## Task 4 — FormField

Create file: `apps/agent-native/components/FormField.tsx`

```tsx
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
```

---

## Task 5 — ChipSelector

Create file: `apps/agent-native/components/ChipSelector.tsx`

```tsx
import { ScrollView, View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'

interface ChipSelectorProps {
  options:  string[]
  value:    string
  onChange: (value: string) => void
  wrap?:    boolean  // if true, use flex-wrap instead of horizontal scroll
}

export function ChipSelector({ options, value, onChange, wrap = false }: ChipSelectorProps) {
  const chips = options.map(option => (
    <TouchableOpacity
      key={option}
      onPress={() => onChange(option)}
      style={[
        styles.chip,
        value === option && styles.chipActive,
      ]}
    >
      <Text style={[
        styles.chipText,
        value === option && styles.chipTextActive,
      ]}>
        {option}
      </Text>
    </TouchableOpacity>
  ))

  if (wrap) {
    return (
      <View style={styles.wrapContainer}>
        {chips}
      </View>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {chips}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrapContainer: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  chip: {
    borderWidth:   1.5,
    borderColor:   colors.sand,
    borderRadius:  20,
    paddingHorizontal: 14,
    paddingVertical:   8,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: colors.ochre,
    borderColor:     colors.ochre,
  },
  chipText: {
    fontSize:   13,
    color:      colors.concrete,
    fontWeight: '500',
  },
  chipTextActive: {
    color:      '#fff',
    fontWeight: '700',
  },
})
```

---

## Task 6 — RecordCard (generic card for any record type)

Create file: `apps/agent-native/components/RecordCard.tsx`

```tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { img } from '@carry/shared'
import { StatusBadge } from './StatusBadge'
import { colors } from '../theme/colors'

interface RecordCardProps {
  title:         string
  subtitle?:     string
  detail?:       string
  imageId?:      string
  placeholderEmoji?: string
  isPending?:    boolean
  onPress?:      () => void
}

export function RecordCard({
  title, subtitle, detail, imageId, placeholderEmoji = '📄',
  isPending, onPress,
}: RecordCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress || isPending}
      activeOpacity={0.8}
    >
      {imageId ? (
        <Image
          source={{ uri: img.thumb(imageId) }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 28 }}>{placeholderEmoji}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {isPending && <StatusBadge status="pending" />}
        </View>
        {subtitle && (
          <Text style={{ fontSize: 12, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
        {detail && (
          <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  thumb: { width: 80, height: 80 },
  thumbPlaceholder: { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 12 },
  title: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
})
```

---

## Task 7 — FailedRecordBanner (permanent failure UI)

This solves the **"silent failure" problem** discussed earlier. Agents must see if something failed to sync.

Create file: `apps/agent-native/components/FailedRecordBanner.tsx`

```tsx
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
```

---

## Task 8 — useNetworkStatus hook

Create file: `apps/agent-native/hooks/useNetworkStatus.ts`

```ts
import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'

export interface NetworkStatus {
  isOnline:       boolean
  connectionType: string | null
}

/**
 * useNetworkStatus — uses @react-native-community/netinfo for accurate
 * network detection via Android's native ConnectivityManager.
 * Checks both connectivity AND internet reachability.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline,       setIsOnline]       = useState(true)
  const [connectionType, setConnectionType] = useState<string | null>(null)

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable))
      setConnectionType(state.type)
    })

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable))
      setConnectionType(state.type)
    })

    return unsubscribe
  }, [])

  return { isOnline, connectionType }
}
```

---

## Verifier + Decompose Protocol

After completing all 8 tasks:

1. Run `verifier` — confirm all components compile, no missing imports.
2. If verifier **passes** → immediately read and begin `10_profile_notifications.md`.
3. If verifier **fails** → run `decompose` to isolate each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/10_profile_notifications.md` and begin executing it immediately.**
