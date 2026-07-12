# Learnings: CORS Blocking LAN IP Upload

## Root Cause
`@fastify/cors` with `origin: string[]` does **exact string match**.

The running process used `tsx watch --env-file=.env` which does re-read env on file change. However, the original static array was already compiled into the module scope on startup — the `CORS_ORIGIN` variable was set once at module load time by `.split(',')`. The `tsx watch` reload would fix this, BUT the deeper issue was that any mismatch (port number difference, order of env loading, etc.) silently fails with a 403 preflight — no log output — making it nearly impossible to debug.

## What Changed
- Replaced `origin: string[]` with a **dynamic origin callback** `(origin, cb) => ...`
- Added `isCorsAllowed()` helper that:
  - Checks the explicit `CORS_ORIGIN_SET` (from env)
  - In non-production: also allows **any `http://192.168.x.x` or `http://10.x.x.x`** origin automatically — so changing the LAN IP of the dev machine never requires updating `.env` again
- Rejected origins now emit a `WARN` log line showing exactly which origin was blocked

## Assumption Debunked
- ❌ "CORS_ORIGIN env list is enough" — FALSE in practice. Static arrays are brittle; dynamic functions with explicit logging are the correct pattern for debugging CORS.
- ✅ The `.env` DID have the correct IPs — the failure was in how the value was consumed.
