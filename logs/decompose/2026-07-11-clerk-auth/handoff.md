# Decompose Handoff: Clerk and Cloudinary Fixes

All bugs are successfully resolved and verified:
1. **API Environment Loader**: Added `--env-file=.env` to `dev` script in `apps/api/package.json`.
2. **Robust Fallback**: Updated `extractRoleFromJWT` in `apps/api/src/lib/auth.ts` to call Clerk's Backend API if the `role` claim is absent from the session token.
3. **Agent App Role Guard**: Updated `AgentGuard` in `apps/agent/src/App.tsx` to allow `'admin'` users.
4. **Cloudinary Configuration Sync**: Synchronized `VITE_CLOUDINARY_CLOUD_NAME=piwpzbke` across `apps/agent/.env` and `apps/admin/.env` to align with the backend credentials.

Dev servers have been successfully restarted in the background. Ready to run and test!
