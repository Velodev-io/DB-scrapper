# Variable Tree: Photo upload never starts when agent taps "Add Property Photos"

**Claim:** `UploadManager.addPhotos` throws a TypeError before any photo is queued, because `crypto.randomUUID` is unavailable in a non-secure (HTTP) browsing context.

---

## Test Plan

| Check | PASS | FAIL |
|---|---|---|
| `crypto.randomUUID` callable over HTTPS/localhost | UUID string returned | TypeError thrown |
| `crypto.randomUUID` callable over plain HTTP (LAN) | — | TypeError: not a function |
| Upload flow after polyfill applied | Photo added, status = uploading | Still fails |

---

## Variable Tree

- [x] [Leaf] `crypto.randomUUID` is called in `UploadManager.addPhotos` (line 55)
  - **STATUS: CONFIRMED FAIL** — Not available in non-secure (HTTP) context
  - **Evidence:** `Uncaught TypeError: crypto.randomUUID is not a function`
  - **Root cause:** `.env` sets `VITE_API_BASE=http://192.168.1.11:4001/api/v1` — agent accesses the app over HTTP (not HTTPS), so the browser does not expose Secure Context APIs like `crypto.randomUUID`
- [x] [Composite] Photo picker → `handleFiles` → `addPhotos` → `UploadManager.addPhotos` → crash
  - **STATUS: CONFIRMED** — Entire chain dead on arrival due to leaf failure above
- [ ] [Leaf] Cloudinary sign endpoint reachable from device (secondary — not yet reached)
- [ ] [Leaf] Clerk token available at upload time (secondary — not yet reached)

---

## Findings

**The entire photo upload flow is broken by a single line:**

```ts
// UploadManager.ts line 55 — BROKEN on HTTP
id: crypto.randomUUID(),
```

`crypto.randomUUID()` is a [Secure Context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) API.  
It is only available when the page is loaded from:
- `https://` (any domain), OR
- `http://localhost` / `http://127.0.0.1`

The agent app runs on a LAN IP (`http://192.168.1.11`) over plain HTTP → `crypto.randomUUID` is `undefined` → crash on first photo selection.

**Fix:** Add a UUID fallback for non-secure contexts.
