# Variable Tree: CORS blocks upload from http://192.168.1.11:5181 → :4001

**Claim:** The API CORS config does not allow `http://192.168.1.11:5181` at runtime, despite `.env` containing it.

## Test Plan

| Check | PASS | FAIL |
|---|---|---|
| `CORS_ORIGIN` env contains `http://192.168.1.11:5181` | Yes | No |
| Running API process has the env loaded | Origin allowed | Preflight rejected |
| `@fastify/cors` with string-array matches LAN IP origin | Allowed | Blocked |

## Variable Tree

- [x] [Leaf] `.env` CORS_ORIGIN value — **PASS** — `http://192.168.1.11:5181,http://192.168.1.11:5182` IS present in `/apps/api/.env` line 3
- [ ] [Leaf] API process restarted to pick up updated `.env` — **UNKNOWN** — server has run for 18+ min, env may be stale from before LAN IPs were added
- [ ] [Leaf] @fastify/cors origin array matching — need to verify correct behaviour with string array

## Findings

The `.env` is correct. The most likely cause is:
1. The API server was started BEFORE `http://192.168.1.11:5181` was added to CORS_ORIGIN — the process is running with a stale env snapshot
2. OR the `@fastify/cors` plugin handles origin matching differently than expected when given a string[] (vs a function)

## Fix

Restart the API process so it re-reads `.env`. If CORS still fails, switch to a dynamic origin function in server.ts.
