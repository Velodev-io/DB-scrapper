# Variable Tree: The floor plan image fails to render on the public Real-Estate website property detail page when a property has a valid floorPlanUrl in the database

- [x] [Composite] Property detail page renders the floor plan image
  - [x] [Leaf] Database contains a valid `floorPlanUrl` value for the property
  - [x] [Leaf] Real-Estate API returns `floorPlanUrl` in the `/api/v1/properties/:slug` response
  - [x] [Leaf] Real-Estate web frontend `PropertyDetail.tsx` queries and has code to render the floor plan
  - [x] [Leaf] Frontend resolves the Cloudinary public ID for the floor plan to a full URL (similar to listing photos)
