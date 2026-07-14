import { useRef, useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { api, img } from '@carry/shared'
import type { Property, Paginated } from '@carry/shared'
import { useOfflineList, formatCachedAt } from '../../../hooks/useOfflineList'
import { getPendingRecords, getPendingUploads } from '../../../lib/uploadQueue'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { StaleBanner } from '../../../components/StaleBanner'
import { StatusBadge } from '../../../components/StatusBadge'

export default function PropertyListScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingProps, setPendingProps] = useState<any[]>([])

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  // ── Offline-aware fetch ──────────────────────────────────────────────────
  const { data: properties, loading, fromCache, cachedAt, refetch } =
    useOfflineList<Property>('properties_mine', async () => {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')
      return api.get<Paginated<Property>>('/properties/mine?page=1&limit=50', token)
    })

  // ── Load offline pending records ─────────────────────────────────────────
  const loadPending = useCallback(async () => {
    const records = getPendingRecords()
    const props = records
      .filter(r => r.type === 'property')
      .map(r => ({
        id:           r.id,
        title:        r.payload.title,
        propertyType: r.payload.propertyType,
        listingType:  r.payload.listingType,
        priceLabel:   r.payload.priceLabel ?? '—',
        locality:     r.payload.locality,
        city:         r.payload.city,
        images:       [],
        isPendingSync: true,
      }))
    setPendingProps(props)
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  const allProperties = [...pendingProps, ...properties]

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      disabled={item.isPendingSync}
      onPress={() => router.push(`/property/${item.id}` as any)}
      activeOpacity={0.8}
    >
      {item.images?.[0] && !item.isPendingSync ? (
        <Image
          source={{ uri: img.thumb(item.images[0]) }}
          style={styles.cardThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
          <Text style={{ fontSize: 28 }}>🏠</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.isPendingSync && <StatusBadge status="pending" />}
        </View>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.propertyType} · {item.listingType}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
          {item.priceLabel}
        </Text>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.locality}, {item.city}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.pageTitle}>My Properties</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/properties/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Stale Data Banner */}
      {fromCache && (
        <StaleBanner cachedAt={cachedAt} onRetry={refetch} />
      )}

      {/* List */}
      <FlatList
        data={allProperties}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && properties.length > 0}
            onRefresh={refetch}
            tintColor={colors.ochre}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏠</Text>
              <Text style={{ fontSize: 15, color: colors.concrete, textAlign: 'center' }}>
                No properties yet.{'\n'}Tap + New to submit your first one.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingTop:     60,
    paddingBottom:  16,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  newBtn: {
    backgroundColor: colors.ochre,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:   8,
  },
  newBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection:   'row',
    backgroundColor: '#fff',
    borderRadius:    12,
    marginBottom:    12,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  cardThumb: {
    width:  90,
    height: 90,
  },
  cardThumbPlaceholder: {
    backgroundColor: colors.sand,
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardBody: {
    flex:    1,
    padding: 12,
  },
  cardTitle: {
    fontSize:   14,
    fontWeight: '600',
    color:      colors.ink,
    flex:       1,
  },
})
