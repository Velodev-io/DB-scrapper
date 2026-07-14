# File 11 — EAS Build & Play Store Deployment

> **Antigravity Instructions:**
> This is the final file. Configure EAS Build, create the Play Store APK/AAB, and document the complete deployment process. After this file's verifier passes, the entire chain is complete.

---

## Task 1 — Install EAS CLI

```bash
npm install -g eas-cli
eas --version
```

Log in to Expo account (create one at expo.dev if not already done):

```bash
eas login
```

---

## Task 2 — Create `eas.json`

Create file: `apps/agent-native/eas.json`

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_REPLACE_ME",
        "EXPO_PUBLIC_API_BASE": "http://YOUR_LAN_IP:4001/api/v1"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_REPLACE_ME",
        "EXPO_PUBLIC_API_BASE": "https://your-api.vercel.app/api/v1"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_REPLACE_ME",
        "EXPO_PUBLIC_API_BASE": "https://your-api.vercel.app/api/v1"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

> **Note:** Replace all `REPLACE_ME` values with real keys before building.

---

## Task 3 — Configure `expo-updates` in `app.json`

Update the `expo` object in `apps/agent-native/app.json` to add updates config:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "fallbackToCacheTimeout": 0
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

> **Note:** The `YOUR_PROJECT_ID` is obtained after running `eas init` in the next step.

---

## Task 4 — Initialize EAS Project

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection/apps/agent-native"
eas init
```

This creates an `extra.eas.projectId` in `app.json`. Copy the project ID and paste it into the updates URL in Task 3.

---

## Task 5 — Build Development APK (for testing on device)

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection/apps/agent-native"

# Build development APK — includes dev menu + hot reload
eas build --profile development --platform android --local
```

> **`--local` flag:** Builds on your machine instead of EAS servers — faster for first test.
> Requires Android SDK + Java (Android Studio already installed ✅).

The APK will be output to `apps/agent-native/build/` when complete.

---

## Task 6 — Install on Device

```bash
# Connect your Android phone via USB or ADB Wi-Fi
/Users/binova/Library/Android/sdk/platform-tools/adb devices

# Confirm device appears, then install
/Users/binova/Library/Android/sdk/platform-tools/adb install \
  "/Users/binova/Documents/Projects/Suru/Data collection/apps/agent-native/build/*.apk"
```

---

## Task 7 — Run Dev Server for Hot Reload

After installing the dev APK on the device:

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection/apps/agent-native"
npx expo start --dev-client
```

Scan the QR code from the dev menu on your phone, or connect via ADB tunnel:

```bash
npx expo start --dev-client --tunnel
```

---

## Task 8 — Test All Offline Scenarios Before Production Build

Run through this checklist manually on the device:

**Scenario 1: Submit while online**
- [ ] Open app → sign in
- [ ] Fill property form → submit
- [ ] Confirm record appears in Properties list
- [ ] Open admin panel → confirm property appears with `pending` status

**Scenario 2: Submit while offline**
- [ ] Turn on Airplane Mode on the phone
- [ ] Fill property form → submit
- [ ] Confirm "Saved Offline" alert appears
- [ ] Confirm record appears in list with 🟡 "Pending Sync" badge
- [ ] Turn Airplane Mode off
- [ ] Confirm NetworkBanner shows "Syncing..." then "✅ All synced"
- [ ] Open admin panel → confirm record now appears

**Scenario 3: Background sync (app killed)**
- [ ] Submit 2–3 records while offline
- [ ] Force-kill the app (swipe away from recents)
- [ ] Turn Airplane Mode off
- [ ] Wait up to 15 minutes
- [ ] Confirm push notification arrives: "Carry — All Synced"
- [ ] Open app → confirm pending count is 0

**Scenario 4: Photo upload**
- [ ] Take a photo from camera
- [ ] Submit form while offline → confirm photo queued
- [ ] Reconnect → confirm photo uploads to Cloudinary
- [ ] Open admin panel → confirm photo appears

**Scenario 5: Cached list display**
- [ ] Go online → open Properties list (data loads from API)
- [ ] Turn off internet
- [ ] Close and reopen the app
- [ ] Open Properties list → stale banner should appear with "Last synced X ago"
- [ ] Tap "Retry" → confirm error message (no connection)

---

## Task 9 — Build Preview APK (for sharing without Play Store)

Once all scenarios pass:

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection/apps/agent-native"
eas build --profile preview --platform android
```

This builds a production-grade APK (no dev menu) that can be:
- Shared directly via a download link (EAS hosts it)
- Installed on agents' phones via the link
- No Play Store account needed for this

EAS will print a download link when done. Share this with your field agents for testing.

---

## Task 10 — Build Production AAB (for Play Store)

When ready for Play Store:

```bash
eas build --profile production --platform android
```

This produces an `.aab` (Android App Bundle) optimized for the Play Store.

---

## Task 11 — Play Store Setup

1. **Create Play Store Account:** https://play.google.com/console — one-time $25 registration fee.

2. **Create the App:**
   - App name: `Carry Field Ops`
   - Package name: `io.carry.fieldops`
   - Category: `Business`

3. **Internal Testing Track:**
   - Upload the `.aab` from Task 10
   - Add tester email addresses (your field agents)
   - They receive an email invite to install via Play Store

4. **Content Rating:** Fill out the questionnaire (select business app, no sensitive content).

5. **Submit for Review:** Internal track doesn't need Google review — available to testers immediately.

---

## Task 12 — OTA Update Workflow (after initial release)

For future updates that are JS-only (no new native packages):

```bash
# Make your code changes to apps/agent-native
# Then push OTA update (agents get it silently on next app open)

eas update --branch production --message "feat: improved offline sync"
```

For updates that add new native packages (expo install new-package):
```bash
# Must do a full EAS build
eas build --profile production --platform android
# Then upload new AAB to Play Store
eas submit --platform android
```

---

## Task 13 — Rollback procedure

If an OTA update causes issues:

```bash
# View recent updates
eas update:list

# Roll back to previous update
eas update:republish --branch production --group <previous-group-id>
```

---

## Task 14 — Update `apps/agent-native/package.json` scripts

Add full set of build scripts:

```json
{
  "scripts": {
    "start":              "expo start",
    "start:dev-client":   "expo start --dev-client",
    "android":            "expo run:android",
    "build:dev":          "eas build --profile development --platform android --local",
    "build:preview":      "eas build --profile preview --platform android",
    "build:production":   "eas build --profile production --platform android",
    "submit":             "eas submit --platform android",
    "update":             "eas update --branch production",
    "type-check":         "tsc --noEmit"
  }
}
```

---

## Final Verifier + Decompose Protocol

After completing all 14 tasks:

1. Run `verifier` one final time — full compile check on the complete `apps/agent-native` codebase.
2. If verifier **passes** → the entire chain is complete. ✅
3. If verifier **fails** → run `decompose` to isolate each error. Apply handoff fix. Re-run `verifier`.
4. If decompose cannot fix after 3 attempts → report remaining errors to user.

---

## ✅ Chain Complete

Congratulations — when this file's verifier passes, the complete React Native agent app is built:

- `packages/logic/` — shared form states, hooks, adapters
- `apps/agent-native/` — full Expo app with:
  - Clerk auth + SecureStore token cache
  - expo-sqlite native storage (no eviction)
  - Background sync via Android WorkManager (stopOnTerminate: false + startOnBoot: true)
  - All 3 form types with photo upload + offline queue
  - All 3 list screens with stale data banner
  - Profile screen with sync status + failed record UI
  - Push notifications for sync results
  - OTA updates
  - EAS Build ready for Play Store

**Every problem identified in the Capacitor approach is solved in this native app.**
