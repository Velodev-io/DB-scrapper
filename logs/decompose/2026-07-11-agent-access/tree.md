# Variable Tree: Agent Access & Invite Flow

**Claim**: The agent app grants access and the invite flow works correctly for all account states.

## Test Plan

### Variable A — Access Pending never resolves for alpinedesi0@gmail.com
**PASS**: Within 2s of `user.reload()` being called, the app transitions from "Access Pending" to the main app.
**FAIL**: "Access Pending" persists indefinitely despite the user having `role: agent` in Clerk.

- [ ] [Leaf] A.1: `alpinedesi0@gmail.com` has `role: agent` set in Clerk
- [ ] [Leaf] A.2: `user.reload()` is being called on the correct user object and returns updated publicMetadata

### Variable B — "Unprocessable Entity" when inviting an existing user
**PASS**: Inviting an email that already has a Clerk account assigns them `role: agent` directly.
**FAIL**: The API returns `422 Unprocessable Entity` because `createInvitation` rejects already-registered emails.

- [ ] [Leaf] B.1: The `/agents/invite` API endpoint handles existing Clerk users by calling `updateUserMetadata` instead of `createInvitation`
- [ ] [Leaf] B.2: The frontend shows a clear error distinguishing "invited (pending)" vs "already registered (role granted)"
