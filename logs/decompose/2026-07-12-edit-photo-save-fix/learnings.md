# Decompose Learnings: Edit Photo Save Fix

## Verified Claims

1. **Scope Mapping Root Cause**:
   - `UploadManager.ts` had a hardcoded mapping that resolved Cloudinary destination folders and backend field names based on exact scope match (e.g. `profilePhotoUrl`, `floorPlanUrl`).
   - The edit modal details were using custom scopes (`labour-edit-profile`, `prop-edit-floor`), which fell back to the default `properties` model & folder.
   - This broke offline background sync and caused confusion. I fixed this by using `.includes()` to resolve scopes.

2. **Submit Lock During Uploads**:
   - When users added new photos, they could instantly click "Save Changes" before the upload state was `'done'`.
   - Since the upload was still in progress, `newProfilePhotoUrl` was `null`, so the payload was updated with `null`.
   - I used `usePhotoUpload` to check for active uploads (`uploading` or `queued`) and disabled the "Save Changes" button, changing its label to "Uploading..." until completion.
