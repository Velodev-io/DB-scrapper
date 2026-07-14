import { View, Text, TouchableOpacity } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { colors } from '../theme/colors'

export default function PendingAccessScreen() {
  const { signOut } = useAuth()

  return (
    <View style={{
      flex: 1, backgroundColor: colors.paper,
      alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⏳</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center', marginBottom: 8 }}>
        Access Pending
      </Text>
      <Text style={{ fontSize: 14, color: colors.concrete, textAlign: 'center', lineHeight: 22, marginBottom: 40 }}>
        Your account is awaiting activation. Contact your admin to get your agent role assigned.
      </Text>
      <TouchableOpacity
        onPress={() => signOut()}
        style={{
          borderWidth: 1.5,
          borderColor: colors.concrete,
          borderRadius: 10,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: colors.concrete, fontSize: 14 }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
