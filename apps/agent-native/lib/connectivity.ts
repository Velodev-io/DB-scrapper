import NetInfo from '@react-native-community/netinfo'

// A failed API call can mean the device is offline, or that the request reached
// the server and got rejected/timed out — those need different user messaging.
// Checked after the failure (not before) so a connection that drops mid-request
// is still reported accurately.
export async function isDeviceOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return !!(state.isConnected && state.isInternetReachable)
}
