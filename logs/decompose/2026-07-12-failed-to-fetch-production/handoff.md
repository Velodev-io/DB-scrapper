# Handoff: Redeploying Frontend with Production Environment Variables

## Proposed Solution
Build and deploy the frontend workspaces so that the production Vite bundler picks up the new `.env.production` files.

## Actions to execute:
1. Re-build and re-deploy the admin app:
   ```bash
   npm run deploy:admin
   ```
2. Re-build and re-deploy the agent app:
   ```bash
   npm run deploy:agent
   ```
3. Commit and push the new `.env.production` configuration files to the repository.
