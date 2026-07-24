import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import {
  getPendingCount, getPendingRecords, getPendingUploads, resetStuckUploads,
} from '../../lib/uploadQueue'
import { runFullSync } from '../../lib/sync'
import { clearAllReadCache } from '../../lib/localCache'
import { clearPersistedToken } from '../../lib/auth'
import { unregisterBackgroundSync } from '../../lib/backgroundSync'
import { refreshBadge } from '../../lib/notifications'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { FailedRecordBanner } from '../../components/FailedRecordBanner'

const MAX_ATTEMPTS = 5

export default function ProfileScreen() {
  const { signOut, getToken, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()

  const [pendingCount,  setPendingCount]  = useState(0)
  const [failedCount,   setFailedCount]   = useState(0)
  const [syncing,       setSyncing]       = useState(false)
  const [lastSynced,    setLastSynced]    = useState<Date | null>(null)

  const refreshCounts = useCallback(() => {
    const total   = getPendingCount()
    const uploads = getPendingUploads()
    const failed  = uploads.filter(u => u.attempts >= MAX_ATTEMPTS && !u.publicId).length
    setPendingCount(total)
    setFailedCount(failed)
    refreshBadge(total)
  }, [])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  const handleManualSync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Your session has expired — please sign in again.')
      await runFullSync(token)
      setLastSynced(new Date())
      refreshCounts()
      Alert.alert('Sync Complete', getPendingCount() === 0
        ? 'All records synced successfully!'
        : `${getPendingCount()} record${getPendingCount() > 1 ? 's' : ''} still pending.`
      )
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.message ?? 'Could not sync. Check your connection.')
    } finally {
      setSyncing(false)
    }
  }

  const handleRetryFailed = async () => {
    Alert.alert(
      'Retry Failed Records',
      'This will attempt to re-upload all failed records. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          // Failed uploads are stuck because they hit MAX_ATTEMPTS — a plain
          // sync would just re-skip them, so reset the counter first.
          onPress: () => { resetStuckUploads(); handleManualSync() },
        },
      ]
    )
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await unregisterBackgroundSync()
            await clearPersistedToken()
            clearAllReadCache()
            await signOut()
            router.replace('/sign-in')
          },
        },
      ]
    )
  }

  const pendingRecords  = getPendingRecords()
  const pendingUploads  = getPendingUploads()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.pageTitle}>Profile</Text>
      </View>

      {/* Agent Info Card */}
      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
            {user?.fullName ?? user?.firstName ?? 'Test Agent'}
          </Text>
          <Text style={{ fontSize: 13, color: colors.concrete, marginTop: 2 }}>
            {user?.primaryEmailAddress?.emailAddress ?? 'ops@carryconstruction.com'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={{ fontSize: 10, color: colors.ochre, fontWeight: '700' }}>
              {(user?.publicMetadata?.role as string ?? 'agent').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Failed Records Banner */}
      <FailedRecordBanner count={failedCount} onRetry={handleRetryFailed} />

      {/* Sync Status Card */}
      <View style={[styles.card, { flexDirection: 'column', gap: 12 }]}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
          Sync Status
        </Text>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pendingRecords.length}</Text>
            <Text style={styles.statLabel}>Records Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pendingUploads.filter(u => !u.publicId).length}</Text>
            <Text style={styles.statLabel}>Photos Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, failedCount > 0 && { color: colors.error }]}>
              {failedCount}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {lastSynced && (
          <Text style={{ fontSize: 11, color: colors.concrete }}>
            Last synced: {lastSynced.toLocaleTimeString()}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={handleManualSync}
          disabled={syncing}
        >
          {syncing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.syncBtnText}>↑ Sync Now</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={[styles.card, { flexDirection: 'column', gap: 8 }]}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 }}>
          About
        </Text>
        <InfoRow label="App Version" value="1.0.0" />
        <InfoRow label="Background Sync" value="Enabled (every 15 min)" />
        <InfoRow label="Storage" value="Native SQLite (no eviction)" />
        <InfoRow label="Auto Updates" value="Enabled (OTA)" />
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: colors.concrete }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.ink, fontWeight: '500' }}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { paddingBottom: 100 },
  header: {
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.sand,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, margin: 16, marginBottom: 0,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center',
  },
  roleBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,134,26,0.12)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat:    { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, backgroundColor: colors.sand, marginVertical: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 10, color: colors.concrete, marginTop: 2, textAlign: 'center' },
  syncBtn: {
    backgroundColor: colors.ochre, borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  signOutBtn: {
    margin: 16, marginTop: 16,
    borderWidth: 1.5, borderColor: colors.error,
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  signOutText: { color: colors.error, fontWeight: '600', fontSize: 14 },
})
