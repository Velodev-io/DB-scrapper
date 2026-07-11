# Variable Tree: Clerk Invitation Signup Access Bug

**Claim**: A user gets access immediately after signing up if they were previously invited via email, even if they register directly or via social login.

## Test Plan

### Variable A — Invitation is created with correct metadata
**PASS**: `clerk.invitations.createInvitation` is called and returns an invitation with `publicMetadata: { role: 'agent' }`.
**FAIL**: Invitation is created without the `agent` role in its metadata.

- [x] [Leaf] A.1: The invite flow in `agents.ts` sets `publicMetadata: { role: 'agent' }`.

### Variable B — Clerk automatically copies metadata on manual registration
**PASS**: Signing up directly at `apps/agent` using the same email address automatically populates the user's `publicMetadata` with `role: 'agent'`.
**FAIL**: Signing up directly creates a user with `publicMetadata` as empty/undefined, leaving them in "Access Pending" status.

- [x] [Leaf] B.1: Verified that Clerk's standard registration flow does **not** link user invitations when they sign up directly (without using the invitation token magic link).

### Variable C — Sync agent role backend handler (Fallback)
**PASS**: An API endpoint `POST /agents/sync-role` is called by the agent client during "Access Pending", checks if the user has a pending invitation, grants them `role: agent`, and the client receives the updated role on reload.
**FAIL**: No endpoint exists, or it fails to find the pending invitation, leaving the user stuck in "Access Pending".

- [x] [Leaf] C.1: Backend `POST /agents/sync-role` is implemented and verified to grant access to invited-but-roleless users.
- [x] [Leaf] C.2: Frontend `AgentGuard` hits the sync endpoint when a logged-in user has no role.
