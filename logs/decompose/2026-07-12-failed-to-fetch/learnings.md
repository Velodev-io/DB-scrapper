# Decompose Learnings: Failed to Fetch Issue

## Objective
Diagnose and resolve the "Failed to Fetch" error when accessing properties/routes in the deployed Carry Admin application.

## Findings & Verifications

### 1. API Reachability
- The Vercel deployment endpoint `https://carry-api-pink.vercel.app/api/v1/properties` was verified to be healthy and fully reachable, returning `401 Unauthorized` as expected.

### 2. CORS Blockage Identified
- **Assumption Debunked**: We assumed the initial `CORS_ORIGIN` list on Vercel (`https://carry-agent.web.app` and `https://carry-admin.web.app`) covered the deployed environments.
- **Actual Behavior**: The live Firebase Hosting projects created were `carry-agent-suryansh` and `carry-admin-suryansh` due to name availability constraints. Thus, their origins (`https://carry-agent-suryansh.web.app` and `https://carry-admin-suryansh.web.app`) were missing the `-suryansh` suffix in the Vercel `CORS_ORIGIN` configuration.
- Consequently, preflight OPTIONS requests did not return the `access-control-allow-origin` header, causing the browser to block API calls with a "Failed to fetch" error.

### 3. Resolution
- We removed the old `CORS_ORIGIN` env variable from the Vercel project:
  ```bash
  vercel env rm CORS_ORIGIN production --yes
  ```
- We registered the corrected list of allowed origins on Vercel:
  ```bash
  echo -n "http://localhost:5181,http://localhost:5182,https://carry-agent-suryansh.web.app,https://carry-admin-suryansh.web.app,https://carry-agent.web.app,https://carry-admin.web.app" | vercel env add CORS_ORIGIN production
  ```
- Redeployed the API using `vercel --prod` to apply the environment changes.
- Re-tested with a simulated OPTIONS preflight request using curl, which now successfully returns:
  ```http
  access-control-allow-origin: https://carry-admin-suryansh.web.app
  access-control-allow-credentials: true
  ```
