# Variable Tree: Assign Roles and Create Agent Profiles Directly

Primary Claim: `@carry/admin and @carry/api allow creating agent profiles directly and assigning roles (agent/admin) during creation and edit, removing the invitation flow.`

## Variables

- [x] [Composite] Variable A: Admin dashboard lists and manages agent profiles with roles.
  - [x] [Leaf] Variable A.1: Replace the "+ Invite Agent" button and modal with "+ Make Profile" in `Agents.tsx`.
  - [x] [Leaf] Variable A.2: Support role input (text input) in create and edit modals.
  - [x] [Leaf] Variable A.3: Display the role badge in the table and mobile views.
- [x] [Composite] Variable B: API backend supports role listing, direct profile creation, and editing.
  - [x] [Leaf] Variable B.1: Update `GET /agents` to list both `agent` and `admin` users.
  - [x] [Leaf] Variable B.2: Implement `POST /agents` to create users in Clerk and upsert them in the database.
  - [x] [Leaf] Variable B.3: Update `PATCH /agents/:clerkUserId` to support changing the user's role.

## Test Plan

### Verification Criteria

#### Variable A & B (Direct Creation & Roles)
- **Action**: Click "+ Make Profile", fill in details with Role "Admin" and create the profile.
- **PASS**:
  - The profile is successfully created in Clerk and inserted in the local database.
  - The list displays the new user with the "Admin" role badge.
  - Editing the user and changing role to "Agent" successfully updates Clerk public metadata and DB, showing the updated role badge.
- **FAIL**: Error during creation, or user is not created in Clerk, or database is not updated, or role cannot be changed.
