# Handoff: Fix applied

## File changed
`packages/shared/src/api.ts`

## Change
```diff
-  const headers: Record<string, string> = {
-    'Content-Type': 'application/json',
-    ...(token ? { Authorization: `Bearer ${token}` } : {}),
-    ...(init.headers as Record<string, string> ?? {}),
-  }
+  const headers: Record<string, string> = {
+    // Only set Content-Type when sending a body — Fastify rejects bodyless
+    // DELETE/GET requests that carry Content-Type: application/json with 400.
+    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
+    ...(token ? { Authorization: `Bearer ${token}` } : {}),
+    ...(init.headers as Record<string, string> ?? {}),
+  }
```

## Status
✅ DONE — no further action needed. Restart the admin/api dev servers to pick up changes.
