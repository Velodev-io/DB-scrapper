# File 00 — Kickoff & Prerequisites

> **Antigravity Instructions:**
> This is the entry point for the entire React Native agent app build chain.
> Read this file completely. Perform every check listed. Then chain to `01_logic_package.md` automatically.
> Do NOT stop between files — the entire chain runs to completion unless a verifier error cannot be resolved.

---

## Your Mission

Build a full offline-first React Native (Expo) agent app for Carry Field Ops, in the same monorepo as the existing web app. All 11 phases run in sequence from this kickoff file through to Play Store deployment setup.

The app must solve every problem identified in the existing Capacitor web approach:
- ✅ Background sync that works when app is killed (Android WorkManager via `expo-background-fetch`)
- ✅ Real network detection (not `navigator.onLine`)
- ✅ Native SQLite storage (no eviction risk)
- ✅ Permanent failure UI (agents see if records failed, not silent drop)
- ✅ JWT refresh strategy for background sync (SecureStore)
- ✅ Push notifications for sync status
- ✅ OTA updates (no Play Store review for JS changes)
- ✅ App badge for pending sync count

---

## Step 1 — Verify Repository State

Run the following and confirm everything is healthy before starting:

```bash
# From repo root
cd "/Users/binova/Documents/Projects/Suru/Data collection"

# Confirm workspaces
cat package.json | grep -A5 workspaces

# Confirm existing packages
ls packages/
ls apps/

# Confirm shared package builds
npm run build -w packages/shared 2>&1 | tail -5

# Confirm web agent app builds cleanly
npm run build -w apps/agent 2>&1 | tail -10
```

**Expected:** `packages/shared` builds with no errors. `apps/agent` builds cleanly (or has only pre-existing errors — note them, do not fix them yet).

---

## Step 2 — Check Root package.json Workspaces

Open `/Users/binova/Documents/Projects/Suru/Data collection/package.json`.

Ensure it has both `apps/*` and `packages/*` in workspaces. If `packages/*` is missing, add it:

```json
{
  "name": "carry-field-ops",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Save if changed. Run `npm install` from the root to re-link workspaces.

---

## Step 3 — Confirm Git is clean

```bash
cd "/Users/binova/Documents/Projects/Suru/Data collection"
git status
```

If there are uncommitted changes from the Capacitor/offline work done earlier, commit them now:

```bash
git add -A
git commit -m "chore: offline-first Capacitor implementation (pre-RN)"
```

---

## Step 4 — Install EAS CLI globally

```bash
npm install -g eas-cli
eas --version
```

If already installed, confirm version is >= 16.

---

## Step 5 — Verify Android Studio & ADB

```bash
# ADB path check
/Users/binova/Library/Android/sdk/platform-tools/adb version

# List connected devices
/Users/binova/Library/Android/sdk/platform-tools/adb devices
```

Note the output — we'll need this for testing in Phase 11.

---

## Verifier + Decompose Protocol

After completing all steps in this file:

1. Run `verifier` to confirm the existing monorepo compiles cleanly.
2. If verifier **passes** → immediately read and begin `01_logic_package.md`.
3. If verifier **fails** → run `decompose` to break down and isolate each error, then apply the handoff fix. Re-run `verifier`. If pass → proceed to `01_logic_package.md`.
4. If decompose cannot fix after 3 attempts → report remaining errors to user and stop.

---

## Chain Instruction

**After this file's verifier passes: Read `rn-agent/01_logic_package.md` and begin executing it immediately.**
