import { useRef, useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { api, img } from '@carry/shared'
import type { Shop, Paginated } from '@carry/shared'
import { useOfflineList } from '../../../hooks/useOfflineList'
import { getPendingRecords } from '../../../lib/uploadQueue'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { StaleBanner } from '../../../components/StaleBanner'
import { StatusBadge } from '../../../components/StatusBadge'

export default function ShopListScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingShops, setPendingShops] = useState<any[]>([])

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  const { data: shopList, loading, fromCache, cachedAt, refetch } =
    useOfflineList<Shop>('shops_mine', async () => {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')
      return api.get<Paginated<Shop>>('/shops/mine?page=1&limit=50', token)
    })

  const loadPending = useCallback(() => {
    const records = getPendingRecords()
    const shops = records
      .filter(r => r.type === 'shop')
      .map(r => ({
        id:           r.id,
        shopName:     r.payload.shopName,
        shopType:     r.payload.shopType,
        keeperName:   r.payload.keeperName,
        keeperPhone:  r.payload.keeperPhone,
        address:      r.payload.address,
        images:       [],
        isPendingSync: true,
      }))
    setPendingShops(shops)
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  const allShops = [...pendingShops, ...shopList]

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      disabled={item.isPendingSync}
      activeOpacity={0.8}
    >
      {item.images?.[0] && !item.isPendingSync ? (
        <Image
          source={{ uri: img.thumb(item.images[0]) }}
          style={styles.cardThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardThumb, { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 28 }}>🏪</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>{item.shopName}</Text>
          {item.isPendingSync && <StatusBadge status="pending" />}
        </View>
        <Text style={{ fontSize: 13, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
          {item.shopType}
        </Text>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.keeperName} · {item.keeperPhone}
        </Text>
        {item.address && (
          <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.pageTitle}>My Shops</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/shops/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {fromCache && <StaleBanner cachedAt={cachedAt} onRetry={refetch} />}

      <FlatList
        data={allShops}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && shopList.length > 0}
            onRefresh={refetch}
            tintColor={colors.ochre}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏪</Text>
              <Text style={{ fontSize: 15, color: colors.concrete, textAlign: 'center' }}>
                No shops yet.{'\n'}Tap + New to add the first one.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.sand,
  },
  newBtn: {
    backgroundColor: colors.ochre, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardThumb: { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
})
