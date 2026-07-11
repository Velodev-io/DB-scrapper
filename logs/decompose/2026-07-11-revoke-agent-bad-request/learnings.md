# Learnings: Revoke Agent Bad Request

## What was verified
- The frontend correctly assembles `DELETE /agents/:clerkUserId` using `clerkUserId: u.id`
  from the Clerk users list response.
- The shared `api.ts` helper unconditionally set `Content-Type: application/json` on every
  request, including bodyless DELETE and GET calls.
- Fastify's default body parser sees the `Content-Type: application/json` header, tries to
  parse the (absent) body as JSON, and immediately returns `400 Bad Request` before the
  route handler ever runs.

## Assumption debunked
- Initial hypothesis was that `clerk.users.updateUserMetadata(id, { publicMetadata: { role: null } })`
  might be invalid — it is NOT; Clerk docs confirm null removes the key cleanly.
- `prisma.agent.updateMany` does NOT throw on zero matches — also a non-issue.

## Actual behavior
The 400 is thrown by Fastify's JSON body parser, never reaching the route handler.

## Fix applied
`packages/shared/src/api.ts` — only spread `Content-Type: application/json` when `init.body`
is truthy. GET and DELETE requests now omit this header entirely.
