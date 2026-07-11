# Learnings: Clerk Role Flow Security and Edge Cases

We performed a deep check on all variables affecting the invitation, registration, webhook, and role verification flows. We identified and successfully resolved three major security and business logic edge cases.

## Findings

### 1. Admin Downgrade Risk
- **Issue**: If an admin inputted the email address of an existing admin in the "Invite Agent" panel, the backend fallback would locate the user and run `updateUserMetadata` to set `role: 'agent'`. This would downgrade the target admin, locking them out of the admin panel.
- **Fix**: Added a check in `POST /agents/invite` that queries user details and rejects the request with `"User is already an Admin"` if the target user has the admin role.

### 2. Revocation Bypass via Sync-Role Fallback
- **Issue**: When an agent is revoked, their `publicMetadata.role` is set to `null` and their local database status is set to `'revoked'`. However, when they open the app and trigger the `/agents/sync-role` fallback endpoint, it would match their historical accepted/pending invitation and re-grant them the `'agent'` role!
- **Fix**: Updated `POST /agents/sync-role` to query the local database first. If the agent's database record is found and has `status === 'revoked'`, it rejects the request with a `403 Forbidden` error.

### 3. Revocation Bypass via Clerk Account Re-creation
- **Issue**: If a revoked agent deletes their Clerk account and signs up again as a fresh user under the same email, the `user.created` webhook would trigger, see their email matched against the historical accepted invitation, and automatically promote them back to `agent`!
- **Fix**: Updated the Clerk Webhook receiver to first check the local database for existing agents with the same email. If an agent record exists and is marked as `status === 'revoked'`, it blocks the auto-sync and skips role promotion.
