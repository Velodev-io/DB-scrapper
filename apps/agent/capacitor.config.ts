import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.carry.fieldops',
  appName: 'Carry Field Ops',
  // Points to the Vite build output — `npx cap sync android` copies this to Android assets
  webDir: 'dist',
  android: {
    // Matches --paper CSS variable so the system nav bar blends in
    backgroundColor: '#FDFAF6',
    // Capacitor 6 uses the Android System WebView (Chromium-based).
    // Full Background Sync API support on Android 8+ (WebView ≥ 75).
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FDFAF6',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
  // In development: uncomment the server block to point at local Vite server for hot reload
  // server: {
  //   url: 'http://192.168.x.x:5181',
  //   cleartext: true,
  // },
}

export default config
