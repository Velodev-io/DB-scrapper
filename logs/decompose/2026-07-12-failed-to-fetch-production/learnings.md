# Learnings: Fixing "Failed to Fetch" in Production

## Findings
- **The Issue**: The frontend apps (`apps/admin` and `apps/agent`) were built using a local `.env` configuration file that hardcoded `VITE_API_BASE=http://localhost:4001/api/v1`. This caused the compiled assets deployed to Firebase Hosting to attempt fetching from the client's local computer.
- **CORS Verification**: We pulled the production environment variables from Vercel. The `CORS_ORIGIN` variable contains `https://carry-admin-suryansh.web.app` and `https://carry-agent-suryansh.web.app`, which means the backend API already fully permits these origins to send requests.
- **Solution**: We created environment-specific `.env.production` files for both `apps/admin` and `apps/agent` pointing `VITE_API_BASE` to the Vercel-deployed production URL `https://carry-api-pink.vercel.app/api/v1`. During build mode, Vite will automatically select these variables, leaving local development undisturbed.
