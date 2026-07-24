import { useRef, useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { api, img } from '@carry/shared'
import type { Labour, Paginated } from '@carry/shared'
import { useOfflineList, formatCachedAt } from '../../../hooks/useOfflineList'
import { getPendingRecords } from '../../../lib/uploadQueue'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { StaleBanner } from '../../../components/StaleBanner'
import { StatusBadge } from '../../../components/StatusBadge'

export default function LabourListScreen() {
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingLabour, setPendingLabour] = useState<any[]>([])

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  const { data: labourList, loading, fromCache, cachedAt, refetch } =
    useOfflineList<Labour>('labour_mine', async () => {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')
      return api.get<Paginated<Labour>>('/labour/mine?page=1&limit=50', token)
    })

  const loadPending = useCallback(async () => {
    const records = getPendingRecords()
    const labs = records
      .filter(r => r.type === 'labour')
      .map(r => ({
        id:              r.id,
        fullName:        r.payload.fullName,
        age:             r.payload.age,
        gender:          r.payload.gender,
        skillLevel:      r.payload.skillLevel,
        skillType:       r.payload.skillType,
        phone:           r.payload.phone,
        city:            r.payload.city,
        profilePhotoUrl: null,
        isPendingSync:   true,
      }))
    setPendingLabour(labs)
  }, [])

  // On focus, not just mount — a record enqueued from the New screen after this
  // tab first mounted would otherwise stay invisible until the next app launch.
  useFocusEffect(useCallback(() => { loadPending() }, [loadPending]))

  const allLabour = [...pendingLabour, ...labourList]

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      disabled={item.isPendingSync}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: '/(tabs)/labour/[id]',
        params: { id: item.id, record: JSON.stringify(item) },
      } as any)}
    >
      {item.profilePhotoUrl && !item.isPendingSync ? (
        <Image
          source={{ uri: img.thumb(item.profilePhotoUrl) }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 28 }}>👷</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>{item.fullName}</Text>
          {item.isPendingSync && <StatusBadge status="pending" />}
        </View>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>
          {item.age} yrs · {item.gender}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ochre, fontWeight: '600', marginTop: 2 }}>
          {item.skillLevel}{item.skillType ? ` · ${item.skillType}` : ''}
        </Text>
        <Text style={{ fontSize: 11, color: colors.concrete, marginTop: 2 }}>{item.phone}</Text>
        {item.city && <Text style={{ fontSize: 11, color: colors.concrete }}>{item.city}</Text>}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.pageTitle}>My Labour</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/labour/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {fromCache && <StaleBanner cachedAt={cachedAt} onRetry={refetch} />}

      <FlatList
        data={allLabour}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && labourList.length > 0}
            onRefresh={refetch}
            tintColor={colors.ochre}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>👷</Text>
              <Text style={{ fontSize: 15, color: colors.concrete, textAlign: 'center' }}>
                No labour records yet.{'\n'}Tap + New to add the first one.
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
  avatar:  { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
})
