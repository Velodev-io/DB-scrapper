# Variable Tree: Clerk Role Flow Security and Edge Cases

**Claim**: The invitation and role-sync flows are secure against unauthorized access, role downgrades, and bypass of revocation.

## Test Plan

### Variable A — Admin Downgrade Prevention
**PASS**: Inviting an email that already has an `admin` role in Clerk returns an error and does not overwrite/downgrade their role to `agent`.
**FAIL**: Overwrites the admin's role to `agent`, locking them out of admin privileges.

- [x] [Leaf] A.1: The `POST /agents/invite` route checks if the existing user is an `admin` and blocks modification.

### Variable B — Revocation Bypass Prevention (Sync-Role Endpoint)
**PASS**: A user whose agent record is marked as `revoked` in the DB is blocked from using `POST /agents/sync-role` to reclaim access.
**FAIL**: The sync-role endpoint matches their historical invitation and re-grants them the `agent` role.

- [x] [Leaf] B.1: The `POST /agents/sync-role` endpoint checks the local database for `status === 'revoked'` and rejects the request.

### Variable C — Revocation Bypass Prevention (Webhook Endpoint)
**PASS**: If a revoked email is deleted and recreated on Clerk, the `user.created` webhook checks the local DB and blocks auto-granting access.
**FAIL**: The webhook automatically matches the invitation history and grants access to the recreated account.

- [x] [Leaf] C.1: The webhook checks if the email is associated with a `revoked` status in the agent database.
