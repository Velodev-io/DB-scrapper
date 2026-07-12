# Handoff: Edit Photo Save Fix

All objectives have been resolved and verified:

1. **Scope Checking Fix**: Updated `UploadManager.ts` scope check statements to use `includes('profile')` and `includes('floor')` so edit scopes map to the correct database tables and Cloudinary folders.
2. **Submit Lock Check**: Integrated `usePhotoUpload` in `PropertyDetailModal.tsx` and `LabourDetailModal.tsx` to detect active image uploads and disable saving until they complete.
3. **No git operations** were executed.
