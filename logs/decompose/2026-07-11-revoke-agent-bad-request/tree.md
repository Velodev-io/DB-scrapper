# Variable Tree: DELETE /agents/:clerkUserId returns Bad Request when admin clicks "Revoke"

- [x] [Composite] Revoke flow end-to-end fails with "Bad Request"
  - [x] [Leaf] Frontend sends correct clerkUserId in the URL path
  - [x] [Leaf] Fastify body parser rejects the DELETE request (Bad Request)
    - [x] [Leaf] api.ts sends Content-Type: application/json on ALL requests, including DELETE
    - [x] [Leaf] DELETE has no body — Fastify attempts JSON parse on empty body → 400
  - [x] [Leaf] Clerk updateUserMetadata with role: null is valid (docs confirmed)
  - [x] [Leaf] prisma.agent.updateMany is safe — no throw on 0 rows matched

## Test Plan

| Variable | PASS | FAIL |
|---|---|---|
| Content-Type on DELETE | Omitted for bodyless requests | Present on DELETE with no body |
| Fastify response | 200 { revoked: true } | 400 Bad Request |
| Clerk call | metadata updated | SDK throws |
| Prisma update | updateMany runs silently | DB throws |
