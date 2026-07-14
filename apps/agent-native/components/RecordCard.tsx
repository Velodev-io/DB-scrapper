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
