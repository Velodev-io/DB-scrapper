# Learnings: Duplicated Sync Records and Missing Images

## Root Cause #1 — Offline Photo Processing block (Missing Images)

The `UploadManager` uses `getAdaptiveMaxWorkers()` to determine how many concurrent tasks to run.
It was returning `0` when offline:

```ts
if (!navigator.onLine) return 0
```

Since the maximum allowed worker count was `0`, the queue worker was completely blocked from
running. The selected images stayed in `waiting` status. When submitting the form,
`getUploadedIds()` found no finished/queued items and returned `[]`.
Thus, the offline pending records were saved to IndexedDB with no images attached.

**Fix:** Changed `getAdaptiveMaxWorkers()` to return `1` when offline. This allows local
compression and queueing into IndexedDB to proceed, making them ready to sync once back online.

## Root Cause #2 — Non-idempotent submission endpoints (Record Duplication)

The POST `/properties` and POST `/labour` endpoints generated CUIDs on the server side and
inserted a new row every time. Under unstable connection conditions, if the client submitted
the synced record, but the request timed out or connection dropped before the response reached
the client, the client would retry the sync loop. The server, having no way to know it was a
retry, created duplicate database rows.

**Fix:** 
1. The client now generates `crypto.randomUUID()` client-side for all forms.
2. The Fastify endpoints validate and receive the client-provided `id`.
3. The server catches unique constraint violation on the primary key `id` (Prisma error P2002)
   and returns the existing record, guaranteeing idempotency.

## Root Cause #3 — React state batching double click (Record Duplication)

Double-clicking the submit button caused the form submission handler to run twice in the same
render tick. Since state updates are batched, `submitting` was `false` in both events, creating
two distinct pending records in IndexedDB.

**Fix:** Added a `useRef` lock (`submittingRef`) to abort any subsequent submit attempts inside
the same render cycle.
