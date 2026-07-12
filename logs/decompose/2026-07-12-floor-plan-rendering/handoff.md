# Handoff: Floor Plan Rendering Fix

* **Component Modified:** [PropertyDetail.tsx](file:///Users/binova/Documents/Projects/Suru/Real-Estate/apps/web/src/pages/PropertyDetail.tsx)
* **Changes:**
  - Inserted conditional rendering block for `p.floorPlanUrl` right below the amenities list container.
  - Used `<Photo>` to resolve both relative Cloudinary image IDs and external/static fallback URLs.
* **Verification Status:** Tested with `npm run build`, successfully completed build with no linting or type-checking issues.
