# Variable Tree: Admin web application successfully fetches shop/property data in production when API endpoint is accessed

- [ ] [Composite] Admin app fetches data in production without "Failed to fetch" error
  - [x] [Leaf] VITE_API_BASE resolves to production URL in production build
  - [x] [Leaf] production API endpoint is CORS-configured to allow requests from Firebase hosting origins
  - [x] [Leaf] VITE_CLERK_PUBLISHABLE_KEY is correctly configured for production Clerk instance
