# Variable Tree: Edit Photo Save Fix

The objective is to fix photo uploading during record editing (deleting works but adding new photos on edit was not saving correctly).

## Variable Tree

- [x] [Composite] Variable A: Fix photo uploading in edit modals
  - [x] [Leaf] Variable A.1: Fix scope mapping checks in `apps/agent/src/lib/UploadManager.ts` to map edit scopes (`prop-edit-floor`, `labour-edit-profile`) to correct Cloudinary folders and fields
  - [x] [Leaf] Variable A.2: Prevent saving while a photo is uploading in `PropertyDetailModal.tsx` and `LabourDetailModal.tsx`
