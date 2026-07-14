import { Tabs, Redirect } from 'expo-router'
import { View, Platform } from 'react-native'
import { colors } from '../../theme/colors'
import { useAccessGate } from '../../hooks/useAccessGate'

// Simple SVG-less icon components using text/emoji for now
// Replace with react-native-vector-icons or expo/vector-icons in polish phase
function HouseIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="🏠" focused={focused} /></View>
}
function WorkerIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="👷" focused={focused} /></View>
}
function ShopIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="🏪" focused={focused} /></View>
}
function ProfileIcon({ focused }: { focused: boolean }) {
  return <View><TabIcon emoji="👤" focused={focused} /></View>
}

import { Text } from 'react-native'
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
      {emoji}
    </Text>
  )
}

export default function TabLayout() {
  const gate = useAccessGate()

  if (gate.status === 'loading') return null
  if (gate.status === 'signed-out') return <Redirect href="/sign-in" />
  if (gate.status === 'pending') return <Redirect href="/pending-access" />

  return (
    <Tabs
      screenOptions={{
        headerShown:         false,
        tabBarActiveTintColor:   colors.ochre,
        tabBarInactiveTintColor: colors.concrete,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor:  colors.sand,
          borderTopWidth:  1,
          height: Platform.OS === 'android' ? 60 : 80,
          paddingBottom: Platform.OS === 'android' ? 8 : 20,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Properties',
          tabBarIcon: ({ focused }) => <HouseIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="labour"
        options={{
          title: 'Labour',
          tabBarIcon: ({ focused }) => <WorkerIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: 'Shops',
          tabBarIcon: ({ focused }) => <ShopIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tabs>
  )
}
