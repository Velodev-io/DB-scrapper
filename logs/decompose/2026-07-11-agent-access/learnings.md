# Learnings: Agent Access & Invite Flow

## Variable A — "Access Pending" stuck for alpinedesi0@gmail.com
- **Root cause**: `alpinedesi0@gmail.com` is a **4th account** that signed up fresh and had no `publicMetadata.role` set. We had previously set role only on 2 of the 3 roleless accounts.
- **Fix**: Called `clerk.users.updateUserMetadata` to set `role: agent` on `user_3GMk6yLI8DJuQJyODgSXZdTrkex`.
- **Verified**: Clerk confirmed success. The `user.reload()` polling in `AgentGuard` will now resolve the "Access Pending" state within 2 seconds.

## Variable B — "Unprocessable Entity" when inviting existing user
- **Root cause**: `clerk.invitations.createInvitation()` returns HTTP 422 when the email already has a Clerk account. The API was passing this error through as-is with no fallback.
- **Fix**: Updated `POST /agents/invite` in `agents.ts` to catch the 422, look up the existing user by email via `clerk.users.getUserList({ emailAddress: [email] })`, and call `updateUserMetadata` to grant them `role: agent` directly.
- **Frontend fix**: `handleInvite` in `Agents.tsx` now reads the `alreadyRegistered: true` flag in the response and shows a contextual success message — "access granted directly, they can log in now" instead of "invitation sent".
- **Verified**: Build passes, 0 TypeScript errors.
