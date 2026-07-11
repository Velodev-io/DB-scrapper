# Variable Tree: Clerk Auto-Verification and Invitation Linking

**Claim**: A newly registered user who was previously invited automatically receives their role on signup without client-side polling or manual intervention.

## Test Plan

### Variable A — Webhook-based Propagation
**PASS**: Clerk sends a `user.created` webhook; the backend verifies it, retrieves the email, matches it against pending invitations, updates the user's `publicMetadata.role`, and revokes the invitation.
**FAIL**: No webhook handler is configured, or it fails to verify or process the event.

- [x] [Leaf] A.1: A `/webhooks/clerk` endpoint is implemented and verifies SVIX webhook signatures.
- [x] [Leaf] A.2: The webhook handler retrieves the user's email, matches it with a pending Clerk invitation, and calls `updateUserMetadata`.

### Variable B — Clerk Organization Invitations (Native)
**PASS**: Invites are created as Organization Invitations. When the user signs up, Clerk automatically links them to the organization with their invited role.
**FAIL**: Changing to Clerk Organizations requires changing the application architecture and model structures.

- [ ] [Leaf] B.1: The app uses Clerk Organizations to delegate role management and invitations to Clerk's native org features.

### Variable C — Session Token Customization / Client-side Sync Fallback
**PASS**: The frontend syncs the role on first login via our custom API endpoint (`sync-role`), updating the token state on the fly.
**FAIL**: Sync endpoint is not called or fails to trigger, leaving the user roleless until a manual reload or re-invite.

- [x] [Leaf] C.1: Backend `POST /agents/sync-role` is implemented and verified.
- [x] [Leaf] C.2: Frontend `AgentGuard` automatically calls `sync-role` to update user metadata during the pending state.
