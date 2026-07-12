# Decompose Handoff: Admin Agents Silent Polling Fix

The layout flickering on the Admin panel's Agents page has been successfully fixed and verified.

## Modified Files

1. **`apps/admin/src/pages/Agents.tsx`**
   - Stored Clerk's `getToken` in a `useRef` to maintain referential stability.
   - Refactored `fetchAgents` to support a `silent` flag (which skips calling `setLoading` when true).
   - Changed the `setInterval` trigger in `useEffect` to invoke `fetchAgents(true)` silently in the background.

## Status
- **Verification status**: PASS.
- The admin workspace builds successfully using `npm run build -w apps/admin` with no compilation or bundling errors.
