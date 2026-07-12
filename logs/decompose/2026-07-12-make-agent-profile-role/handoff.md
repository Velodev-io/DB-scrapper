# Decompose Handoff: Make Agent Profile & Assign Roles (Typed)

The role assignment (via text inputs) and direct profile creation features have been fully implemented and verified.

## Modified Files

1. **`apps/api/src/routes/agents.ts`**
   - Refactored `GET /agents` to query and return users with any non-empty role string in their metadata.
   - Added `POST /agents` to programmatically provision users in Clerk via `clerk.users.createUser` and upsert database records under the `Agent` schema, accepting any string for role.
   - Updated `PATCH /agents/:clerkUserId` to accept any string role parameter and update it in Clerk metadata.
2. **`apps/admin/src/pages/Agents.tsx`**
   - Replaced "+ Invite Agent" with "+ Make Profile".
   - Removed the Clerk invitation modal and created a detailed "Make Agent Profile" modal (Email, Name, Phone, Age, Role).
   - Changed both Role inputs to standard text fields (instead of select dropdowns), allowing the admin to type the role.
   - Integrated role display badges in desktop tables and mobile card layouts.

## Status
- **Verification status**: PASS.
- Build verified with `npm run build` and `npx tsc --noEmit` across all workspaces.
