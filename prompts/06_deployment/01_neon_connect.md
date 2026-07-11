# Phase 6 — File 01: Connect Neon to Production

> **Antigravity Instructions:** Run these commands in sequence. Ask the user for the Neon connection string if it's not already in .env.

---

## What This File Does

- Verifies the Neon connection string is set
- Runs `prisma migrate deploy` to apply schema to the production Neon database
- Confirms all tables exist in Neon

---

## Step 1: Verify DATABASE_URL in apps/api/.env

Open `apps/api/.env` and confirm it has:
```
DATABASE_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/carry_field_ops?sslmode=require&connection_limit=1&pool_timeout=10"
```

The `connection_limit=1` is important for Vercel serverless — each function invocation gets 1 connection to prevent pool exhaustion.

If the user doesn't have this yet, direct them to:
1. https://neon.tech → their project → Connection Details tab → Prisma tab → copy the URL
2. Add `&connection_limit=1&pool_timeout=10` at the end of the URL before the closing quote

---

## Step 2: Generate Prisma Client for PostgreSQL

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection
npm run -w apps/api prisma:generate
```

Expected: `✔ Generated Prisma Client (v6.x.x)`

---

## Step 3: Create Initial Migration

```bash
npm run -w apps/api prisma migrate dev --name init
```

This creates `apps/api/prisma/migrations/` folder with the initial migration SQL.
Commit this folder to git — it's how Prisma tracks schema history.

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "carry_field_ops"

✔ Generated Prisma Client

The following migration(s) have been created and applied:

migrations/
  └─ 20240101000000_init/
    └─ migration.sql

Your database is now in sync with your Prisma schema.
```

---

## Step 4: Verify Tables in Neon Dashboard

1. Go to https://neon.tech → your project
2. Click **"Tables"** in the left sidebar
3. Confirm these tables exist:
   - `agents`
   - `properties`
   - `construction_projects`
   - `labour`

---

## Step 5: Set DATABASE_URL in Vercel

This was done in `02_vercel_deploy.md` but double-check:

```bash
cd apps/api
vercel env ls production
```

Should show `DATABASE_URL` in the list. If not:
```bash
vercel env add DATABASE_URL production
```
Enter the Neon connection string.

---

## Future Schema Changes

When you need to add a new field to the schema:

1. Edit `apps/api/prisma/schema.prisma`
2. Run: `npm run -w apps/api prisma migrate dev --name <describe-change>`
3. Commit the new migration file
4. On next Vercel deploy, run: `npm run -w apps/api prisma:migrate`
   (or configure Vercel's build command to run `prisma migrate deploy` before starting)

To auto-migrate on Vercel deploy, add to `apps/api/package.json`:
```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy"
  }
}
```

Vercel runs `vercel-build` automatically if it exists.

**✓ Phase 6, File 01 complete. Proceed to `06_deployment/02_vercel_deploy.md`.**
