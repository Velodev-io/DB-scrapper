# Handoff: Clerk Invitation Signup Access Bug

The issue has been resolved by implementing an automatic metadata sync flow upon sign-up.

## Changes Implemented

1. **Backend Route (`apps/api/src/routes/agents.ts`)**:
   - Added a `POST /agents/sync-role` route.
   - It decodes the Clerk JWT to identify the user.
   - If the user has no role, it checks Clerk's pending invitations.
   - If a matching invitation is found for the user's email, it grants them `role: agent` and revokes the pending invitation.
   - If successful, it returns `{ synced: true, role: 'agent' }`.

2. **Frontend Guard (`apps/agent/src/App.tsx`)**:
   - Updated `AgentGuard` to call `POST /agents/sync-role` when a user logs in but has no role.
   - On a successful response (indicating the role has been synced), it immediately triggers `user.reload()` to avoid waiting for the next polling interval.

## Verification

Run the following commands to confirm that builds continue to compile cleanly:
```bash
npm run build -w apps/api
npm run build -w apps/agent
```
Both projects have been verified locally and build successfully.
