# Decompose Learnings: Cloudinary Upload and Clerk Auth Fallback

## 1. What was verified
- Verified that Clerk token local verification was failing because the `CLERK_SECRET_KEY` was not loaded by the Fastify backend (missing `--env-file=.env` on execution).
- Verified that even after loading environment variables, the custom claim `role` was missing from the Clerk session JWT, causing standard verification to fail.
- Verified that implementing a robust fallback to fetch user public metadata directly from the Clerk Backend API resolved the authentication issues transparently for the `admin` role.
- Verified that the `401 (Unauthorized)` error from Cloudinary was caused by the mismatch of `VITE_CLOUDINARY_CLOUD_NAME=carry-construction` in frontend `.env` files while the API was signing for the user's custom Cloudinary cloud (`piwpzbke`).

## 2. Assumptions debunked
- **Assumption:** Vite's frontend automatically resolves backend signing config.
- **Fact:** The frontend `.env` files hardcode the Cloudinary Cloud Name for uploads, which must match the backend signing target.

## 3. Verified behavior
- The backend fallback resolves the user metadata correctly on a missing JWT role claim.
- Corrected `.env` mappings for the cloud name enable successful signed uploads to Cloudinary from the Agent App.
