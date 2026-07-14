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
