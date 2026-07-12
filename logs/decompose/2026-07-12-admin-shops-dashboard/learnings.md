# Learnings: Admin Shops dashboard integration

- **Context**: The admin dashboard (`apps/admin`) uses React with components like Sidebar for navigation. We mirrored the structure of `Labour.tsx` to build `Shops.tsx`.
- **API integration**: Handled via the Fastify backend `/shops` endpoints. Fully supports filters, status review updates, and hard deletion.
- **Location view**: The admin table highlights the shops' address. Inside the detailed modal view, if GPS coordinates (`lat`/`lng`) are present, we display a link to open the location on Google Maps.
