# File 02 — Expo App Bootstrap

> **Antigravity Instructions:**
> Create the complete `apps/agent-native` Expo app with all packages installed, NativeWind configured, and project structure scaffolded. This file creates the empty shell. Screens are filled in later files.

---

## Task 1 — Scaffold the Expo App

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection/apps"
npx create-expo-app@latest agent-native --template blank-typescript
cd agent-native
```

---

## Task 2 — Install All Native Packages

Run this single command from inside `apps/agent-native`:

```bash
npx expo install \
  expo-router \
  expo-font \
  expo-status-bar \
  expo-constants \
  expo-linking \
  expo-secure-store \
  expo-sqlite \
  expo-image-picker \
  expo-image-manipulator \
  expo-background-fetch \
  expo-task-manager \
  expo-notifications \
  expo-location \
  expo-updates \
  react-native-safe-area-context \
  react-native-screens \
  react-native-gesture-handler \
  react-native-reanimated \
  @react-native-community/netinfo \
  @clerk/clerk-expo \
  @expo-google-fonts/inter \
  nativewind \
  tailwindcss \
  react-native-mmkv
```

Then install workspace packages:

```bash
npm install @carry/shared @carry/logic
```

---

## Task 3 — Replace `apps/agent-native/app.json`

Replace the entire file:

```json
{
  "expo": {
    "name": "Carry Field Ops",
    "slug": "carry-field-ops",
    "scheme": "carry",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FDFAF6"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "package": "io.carry.fieldops",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FDFAF6"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      "expo-location",
      "expo-updates",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Carry to select photos for property and shop records.",
          "cameraPermission": "Allow Carry to take photos for records."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#C8861A"
        }
      ],
      "expo-background-fetch",
      "expo-task-manager"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## Task 4 — Create `babel.config.js`

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  }
}
```

---

## Task 5 — Create `metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
```

---

## Task 6 — Create `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matches the web app's CSS tokens exactly
        paper:    '#FDFAF6',
        ink:      '#1a1510',
        ochre:    '#C8861A',
        concrete: '#8c8580',
        sand:     '#E8E0D8',
        steel:    '#2E3A40',
        error:    '#C0392B',
        success:  '#27AE60',
        warning:  '#E67E22',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        bold: ['Inter_700Bold'],
        mono: ['IBMPlexMono_400Regular'],
      },
    },
  },
}
```

---

## Task 7 — Create `global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Task 8 — Create `nativewind-env.d.ts`

```ts
/// <reference types="nativewind/types" />
```

---

## Task 9 — Create `.env` file

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_REPLACE_WITH_REAL_KEY
EXPO_PUBLIC_API_BASE=https://your-api.vercel.app/api/v1
```

> **Note:** Copy `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from `apps/agent/.env` — it is the same Clerk account.

---

## Task 10 — Create `apps/agent-native/package.json`

Ensure it has:

```json
{
  "name": "@carry/agent-native",
  "version": "0.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:preview": "eas build --profile preview --platform android",
    "build:production": "eas build --profile production --platform android"
  },
  "dependencies": {
    "@carry/logic": "*",
    "@carry/shared": "*"
  }
}
```

---

## Task 11 — Create Theme Files

### `apps/agent-native/theme/colors.ts`

```ts
export const colors = {
  paper:    '#FDFAF6',
  ink:      '#1a1510',
  ochre:    '#C8861A',
  concrete: '#8c8580',
  sand:     '#E8E0D8',
  steel:    '#2E3A40',
  error:    '#C0392B',
  success:  '#27AE60',
  warning:  '#E67E22',
} as const

export type ColorKey = keyof typeof colors
```

### `apps/agent-native/theme/spacing.ts`

```ts
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const
```

### `apps/agent-native/theme/typography.ts`

```ts
import { StyleSheet } from 'react-native'
import { colors } from './colors'

export const typography = StyleSheet.create({
  pageTitle: {
    fontSize:   22,
    fontWeight: '700',
    color:      colors.ink,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color:         colors.concrete,
    marginBottom:  4,
  },
  body: {
    fontSize:   14,
    color:      colors.ink,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color:    colors.concrete,
  },
  price: {
    fontSize:   14,
    fontWeight: '600',
    color:      colors.ochre,
  },
})
```

---

## Task 12 — Create Empty App Directory Structure

Create these placeholder files (they will be filled in later phases):

### `apps/agent-native/app/_layout.tsx`

```tsx
// Root layout — filled in 03_auth_navigation.md
import { Text } from 'react-native'
export default function RootLayout() {
  return <Text>Loading...</Text>
}
```

### `apps/agent-native/app/(tabs)/_layout.tsx`

```tsx
// Tab layout — filled in 03_auth_navigation.md
import { Text } from 'react-native'
export default function TabLayout() {
  return <Text>Tabs</Text>
}
```

### `apps/agent-native/app/(tabs)/properties/index.tsx`

```tsx
import { View, Text } from 'react-native'
export default function PropertyListScreen() {
  return <View><Text>Properties</Text></View>
}
```

### `apps/agent-native/app/(tabs)/properties/new.tsx`

```tsx
import { View, Text } from 'react-native'
export default function PropertyFormScreen() {
  return <View><Text>Property Form</Text></View>
}
```

### `apps/agent-native/app/(tabs)/labour/index.tsx`

```tsx
import { View, Text } from 'react-native'
export default function LabourListScreen() {
  return <View><Text>Labour</Text></View>
}
```

### `apps/agent-native/app/(tabs)/labour/new.tsx`

```tsx
import { View, Text } from 'react-native'
export default function LabourFormScreen() {
  return <View><Text>Labour Form</Text></View>
}
```

### `apps/agent-native/app/(tabs)/shops/index.tsx`

```tsx
import { View, Text } from 'react-native'
export default function ShopListScreen() {
  return <View><Text>Shops</Text></View>
}
```

### `apps/agent-native/app/(tabs)/shops/new.tsx`

```tsx
import { View, Text } from 'react-native'
export default function ShopFormScreen() {
  return <View><Text>Shop Form</Text></View>
}
```

### `apps/agent-native/app/(tabs)/profile.tsx`

```tsx
import { View, Text } from 'react-native'
export default function ProfileScreen() {
  return <View><Text>Profile</Text></View>
}
```

### `apps/agent-native/app/sign-in.tsx`

```tsx
import { View, Text } from 'react-native'
export default function SignInScreen() {
  return <View><Text>Sign In</Text></View>
}
```

---

## Task 13 — Verify the App Starts

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection/apps/agent-native"
npx expo start --no-dev --minify 2>&1 | head -30
```

Confirm no startup errors.

---

## Verifier + Decompose Protocol

After completing all tasks:

1. Run `verifier` — confirm TypeScript compiles and no import errors exist in `apps/agent-native`.
2. If verifier **passes** → immediately read and begin `03_auth_navigation.md`.
3. If verifier **fails** → run `decompose` to isolate and fix each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/03_auth_navigation.md` and begin executing it immediately.**
