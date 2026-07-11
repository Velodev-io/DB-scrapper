# Decompose Handoff: Image Download Speed Fix

All performance updates are complete and verified:
1. **Cloudinary Transformation**: Changed `img.full` in `packages/shared/src/cloudinary.ts` to use `q_auto,f_auto`.
2. **Dynamic Extension Parsing**: Updated `apps/admin/src/lib/downloadZip.ts` to dynamically resolve file extension from the blob's MIME type (supporting `webp`, `avif`, `png`, and fallback to `jpg`).

All TS builds verify cleanly. The performance improvement is ready for testing!
