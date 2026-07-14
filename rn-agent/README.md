# React Native Agent App — Master Index

> This folder contains the complete, self-executing implementation plan for the **Carry Field Ops** React Native app.
>
> **How to run:** Open `00_kickoff.md` and follow its instructions. Every file automatically chains to the next after verification passes. You only need to trigger the first file.

---

## Execution Chain

| File | Phase | What it builds |
|---|---|---|
| `00_kickoff.md` | Kickoff | Reads this index, checks prerequisites, chains to 01 |
| `01_logic_package.md` | Phase 1 | Extracts `packages/logic` from the web app |
| `02_expo_bootstrap.md` | Phase 2 | Creates `apps/agent-native` with all packages installed |
| `03_auth_navigation.md` | Phase 3 | Clerk auth + Expo Router layout + all screen shells |
| `04_storage_sync.md` | Phase 4 | expo-sqlite schema + upload queue + background sync |
| `05_photo_upload.md` | Phase 5 | expo-image-picker + compression + Cloudinary upload |
| `06_property_screens.md` | Phase 6 | Property list + Property form (full offline) |
| `07_labour_screens.md` | Phase 7 | Labour list + Labour form (full offline) |
| `08_shop_screens.md` | Phase 8 | Shop list + Shop form (full offline) |
| `09_components.md` | Phase 9 | All shared RN components (cards, banners, chips, etc.) |
| `10_profile_notifications.md` | Phase 10 | Profile screen + push notifications + app badge + OTA |
| `11_eas_build.md` | Phase 11 | EAS Build config + Play Store deployment |

---

## Verifier + Decompose Protocol (applies to EVERY file)

After completing the tasks in each file:

1. Run the **verifier agent** (`verifier`) to compile and audit the code.
2. If verifier **passes** → read the next file in the chain and begin executing it immediately.
3. If verifier **fails** → run the **decompose agent** (`decompose`) to break down, isolate, and fix the errors bottom-up.
4. Decompose will produce a `handoff.md` with the fix. Apply the fix.
5. Re-run the **verifier agent** to confirm all errors are resolved.
6. If verifier passes after decompose → proceed to the next file.
7. If verifier still fails after 3 decompose attempts → stop and report the remaining errors to the user.

This protocol is embedded in every file. Do not skip it.

---

## Repository Context

```
Root:     /Users/binova/Documents/Projects/Suru/Data collection
Apps:     apps/agent (web), apps/admin (web), apps/api (Fastify)
Packages: packages/shared (@carry/shared)
New:      packages/logic (@carry/logic) ← Phase 1 creates this
New:      apps/agent-native ← Phase 2 creates this
```

## Key Design Tokens (same across web and native)

| Token | Value |
|---|---|
| Paper / Background | `#FDFAF6` |
| Ink / Text | `#1a1510` |
| Ochre / Primary | `#C8861A` |
| Concrete / Muted | `#8c8580` |
| Sand / Divider | `#E8E0D8` |
| Error | `#C0392B` |
| Success | `#27AE60` |
