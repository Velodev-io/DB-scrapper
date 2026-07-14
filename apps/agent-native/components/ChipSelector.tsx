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
