# Learnings: Photo Upload Bug — crypto.randomUUID in HTTP Context

## What Was Verified
- `crypto.randomUUID()` is a **Secure Context-only** Web API
- It is available on `https://` origins and `http://localhost` / `http://127.0.0.1`
- It is **NOT available** on `http://192.168.x.x` (LAN IP), even on modern browsers

## Root Cause
The agent app's `.env` sets `VITE_API_BASE=http://192.168.1.11:4001/api/v1`.
Agents access the app from their phones via that LAN IP over plain HTTP.
`crypto.randomUUID` is `undefined` → calling it throws a `TypeError` → the entire `addPhotos` pipeline crashes immediately → no photo is ever queued or uploaded.

## Assumption Debunked
- ❌ "crypto.randomUUID works everywhere modern" — FALSE. The secure context requirement is strict.
- ✅ `crypto.getRandomValues` IS available in all contexts including HTTP, and produces cryptographically secure random bytes.

## Files Affected
1. `apps/agent/src/lib/UploadManager.ts` — line 55 (photo ID generation — the crash site reported in the error)
2. `apps/agent/src/pages/Properties/PropertyForm.tsx` — line 107 (record ID at form submit)
3. `apps/agent/src/pages/Labour/LabourForm.tsx` — line 74 (record ID at form submit)
4. `apps/agent/src/pages/Shops/ShopForm.tsx` — line 57 (record ID at form submit)
