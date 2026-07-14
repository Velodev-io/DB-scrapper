import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { colors } from '../theme/colors'
import { useAccessGate } from '../hooks/useAccessGate'

export default function Index() {
  const gate = useAccessGate()

  if (gate.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.ochre} />
      </View>
    )
  }

  if (gate.status === 'signed-out') return <Redirect href="/sign-in" />
  if (gate.status === 'pending') return <Redirect href="/pending-access" />

  return <Redirect href="/(tabs)/properties" />
}
