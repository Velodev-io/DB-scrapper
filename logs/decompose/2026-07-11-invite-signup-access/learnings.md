# Learnings: Clerk Invitation Signup Access Bug

We investigated why a user invited via email doesn't get access upon initial signup, but gets it instantly if invited again.

## Findings

1. **Clerk Invitation Propagation Linkage**:
   - Clerk only links a sign-up with a pending invitation and propagates the invitation's `publicMetadata` (which contains `{ role: 'agent' }`) if the user signs up using the tokenized invitation link sent in the email.
   - If they register directly (e.g. going to sign-up page directly or logging in via social SSO using the same email address), Clerk creates the user profile without copying the invitation's metadata. Thus, `role` is `undefined`.

2. **Frontend Polling & Missing Fallback**:
   - The agent app checks `publicMetadata.role`. If missing, the app stays on the "Access Pending" screen, polling `user.reload()` every 2 seconds.
   - If the user had signed up directly, they remain stuck on this screen because nothing automatically assigns them the role on the backend.

3. **Re-inviting User Sets Access Instantly**:
   - When the admin invites the same email address again, the backend route `POST /agents/invite` catches the `422 Unprocessable Entity` (email already exists), retrieves the registered user's Clerk ID, and explicitly sets the role in user metadata: `await clerk.users.updateUserMetadata(clerkUserId, { publicMetadata: { role: 'agent' } })`.
   - The user's client-side polling `user.reload()` loop picks up this change within 2 seconds, which lets them in instantly.

## Verification of Fix

- We implemented `POST /agents/sync-role` in the API to allow logged-in users with no role to check if there is an outstanding invitation for their email address. If found, it automatically grants them the role and revokes the invitation to clean up.
- We updated `AgentGuard` in `apps/agent/src/App.tsx` to automatically trigger this sync call when the user logs in but has no role.
- Verified that both the API backend and Agent frontend apps build successfully with TypeScript.
