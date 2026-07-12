# Decompose Learnings: Map and Location Details Rendering

## Findings
* The database schema successfully tracks location parameters (`address`, `locality`, `city`, `lat`, and `lng`).
* The API returns these fields in the `getProperty` call.
* However, the website frontend `PropertyDetail.tsx` page was rendering a static `<Placeholder label="Mappls map" />` component instead of drawing the actual pinned map location.
* In addition, the full property `address` text was omitted entirely from the display.

## Resolution
* Replaced the static map placeholder with a native `<iframe />` Google Maps embed pointing to the correct latitude and longitude coordinates.
* Printed the full address block and locality text cleanly below the Location section header.
