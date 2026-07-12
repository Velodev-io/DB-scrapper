# Decompose Learnings: Remove Location from Top Header

## Findings
* The property header section rendered `{p.locality}, {p.city}` right beneath the property title.
* This duplicate header location was redundant given that the location details were moved down inside the Specifications segment.

## Resolution
* Deleted the `<p className="mt-2 text-ink-soft">{p.locality}, {p.city}</p>` location element from the header title area in `PropertyDetail.tsx`.
