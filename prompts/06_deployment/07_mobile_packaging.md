# Phase 6, File 07: Mobile APK and iOS Packaging (Capacitor)

> **Antigravity Instructions:** This file contains instructions to package the React agent app (`apps/agent`) into a native mobile app for Android (APK) and iOS (IPA) using Capacitor. This bypasses the need for immediate Google Play / Apple App Store publishing.

---

## 1. Prerequisites & Installation

Capacitor wraps the static HTML/JS web build into a native mobile WebView. Run these commands from the root workspace directory.

### Install Capacitor CLI and Core
```bash
# Install core and CLI dependencies in the agent app
npm install @capacitor/core @capacitor/cli -w apps/agent
```

### Initialize Capacitor Project
Inside the `apps/agent` directory, run the initialization command:
```bash
cd apps/agent
npx cap init "Carry Field Ops" "com.carry.fieldops" --web-dir=dist
```

### Install Platforms
Install the native platform SDKs:
```bash
npm install @capacitor/android @capacitor/ios -w apps/agent
```

---

## 2. Configuration Setup

Create or update the configuration file in `apps/agent/capacitor.config.json` to ensure CORS and localhost schemes work correctly on Android and iOS:

```json
{
  "appId": "com.carry.fieldops",
  "appName": "Carry Field Ops",
  "webDir": "dist",
  "server": {
    "androidScheme": "http",
    "iosScheme": "capacitor",
    "hostname": "localhost"
  }
}
```

> [!NOTE]
> The `androidScheme` and `iosScheme` settings ensure the app makes requests from `http://localhost` and `capacitor://localhost` respectively, which are whitelisted in the API's CORS configurations.

---

## 3. Building the Android APK

### Step 1: Add Android Platform
Inside `apps/agent`, add the Android folder structures:
```bash
npx cap add android
```

### Step 2: Build the React Application
Compile the TypeScript code and compile the static assets:
```bash
# Run from the root directory
npm run build -w apps/agent
```

### Step 3: Sync Assets with Android Project
Copy the built web files from the `dist` directory into the native Android folder:
```bash
cd apps/agent
npx cap sync
```

### Step 4: Open in Android Studio & Compile
Open the project in Android Studio to build the `.apk` file:
```bash
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete.
2. In the top menu, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Once completed, a notification will appear. Click **locate** to find the output `.apk` file (typically at `app/build/outputs/apk/debug/app-debug.apk`).
4. Rename this file to `CarryFieldOps.apk` and share it directly with your agents.

---

## 4. Building the iOS Application

Because iOS does not support simple `.ipa` file sharing without an App Store or Developer Account, choose one of the following approaches:

### Option A: iOS PWA (Recommended / Free)
Completely skip compiling a native iOS app. Distribute it as a Progressive Web App (PWA).
1. Deploy the Agent app to Firebase Hosting (`npm run deploy` via Firebase CLI).
2. Ask your agents to open the Firebase hosting link (e.g. `https://carry-agent.web.app`) in **Safari** on their iPhone.
3. Tap the **Share** button (up arrow box) at the bottom.
4. Scroll down and tap **"Add to Home Screen"**.
5. The web app now runs full-screen, without address bars, and has its own icon.
* *Limitation:* If they swipe the PWA closed, background uploads pause. They will automatically resume when the PWA is opened again.

### Option B: TestFlight (Requires Apple Developer Account - $99/year)
1. In `apps/agent`, run `npx cap add ios`.
2. Sync the compiled React code: `npx cap sync`.
3. Open the project in Xcode: `npx cap open ios`.
4. Register your Apple Developer account inside Xcode under Preferences > Accounts.
5. Set your signing certificate and team details.
6. Build and archive the app, then upload it to App Store Connect.
7. Invite your agents as External Testers in TestFlight by adding their email addresses.
* *Limitation:* TestFlight builds expire and must be uploaded again every **90 days**.

---

## 5. Background Upload Optimization (Native Workers)

Because standard JavaScript stops execution when the WebView is closed or swiped away, you can optionalize native background task runners on Android to continue uploads:

### Install Capacitor Background Runner
```bash
npm install @capgo/capacitor-background-runner -w apps/agent
npx cap sync
```

This plugin lets you execute code in a background service when the OS triggers a connectivity changes notification, allowing your queue flusher to run even if the user force-closes the app UI.

---

## Verification Test

1. Generate the `.apk` using the Android Studio instructions.
2. Transfer the `.apk` to an Android test device (via email, USB, or download link).
3. Attempt to open and install. Enable the **"Allow installation from unknown sources"** permission if prompted.
4. Turn off Wi-Fi/Mobile Data (Airplane mode).
5. Open the app and submit a Property record with 3 photos.
6. Verify:
   - The app saves the photos to IndexedDB and shows them as **Queued** (📶 icon).
   - Close/Swipe the app away from the background.
7. Turn Wi-Fi/Mobile Data back on.
8. Reopen the app. Verify:
   - The app instantly runs the foreground flusher, uploads the photos to Cloudinary, patches the database, and clears the queue (✓ icon).
