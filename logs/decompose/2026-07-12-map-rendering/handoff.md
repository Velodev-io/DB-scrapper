# Handoff: Map and Location Details Rendering Fix

* **Component Modified:** [PropertyDetail.tsx](file:///Users/binova/Documents/Projects/Suru/Real-Estate/apps/web/src/pages/PropertyDetail.tsx)
* **Changes:**
  - Replaced the placeholder div with a native Google Maps `iframe` embed.
  - Linked coordinates to `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=15&output=embed`.
  - Added conditional output of `p.address` and `p.locality, p.city` header values.
* **Verification Status:** Workspace successfully compiled with zero typescript build issues (`npm run build` returned exit code 0).
