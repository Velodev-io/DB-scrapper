# Phase 1 — File 01: Neon Database Setup

> **Antigravity Instructions:** This file contains steps the USER must do manually (browser steps). Walk them through each step, then run the commands at the end to verify the connection.

---

## What This File Does

Connects the Prisma schema to a live Neon PostgreSQL database and runs the initial migration.

---

## Manual Steps (User Does These in Browser)

### Step 1: Create a Neon Account

1. Go to: https://neon.tech
2. Sign up with GitHub (fastest)
3. You'll land on the Neon dashboard

### Step 2: Create a New Project

1. Click **"New Project"**
2. Name: `carry-field-ops`
3. Region: **ap-southeast-1 (Singapore)** — closest to Pune, India
4. Postgres version: 16 (latest)
5. Click **"Create Project"**

### Step 3: Get the Connection String

1. On the project page, click **"Connection Details"**
2. Select the **"Prisma"** tab (it formats the URL correctly)
3. Copy the connection string. It looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/carry_field_ops?sslmode=require
   ```
4. Keep this tab open

### Step 4: Update the .env File

In `apps/api/.env`, replace:
```
DATABASE_URL="file:./prisma/dev.db"
```
With your copied Neon connection string:
```
DATABASE_URL="postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/carry_field_ops?sslmode=require"
```

---

## Automated Steps (Antigravity Runs These)

### Step 5: Generate Prisma Client

```bash
cd /Users/binova/Documents/Projects/Suru/Data\ collection
npm run -w apps/api prisma:generate
```

Expected: `✔ Generated Prisma Client`

### Step 6: Push Schema to Neon

```bash
npm run db:push
```

This creates all tables in Neon. Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "carry_field_ops"

✔ Generated Prisma Client

The following migration(s) have been applied:

  agents                  (created)
  properties              (created)
  construction_projects   (created)
  labour                  (created)

Your database is now in sync with your Prisma schema.
```

### Step 7: Verify Tables Exist

```bash
npm run db:studio
```

This opens Prisma Studio at `http://localhost:5555`. Confirm you can see:
- `agents` table (empty)
- `properties` table (empty)
- `construction_projects` table (empty)
- `labour` table (empty)

Close Prisma Studio after confirming.

---

## Neon Capacity Reference

With 50 agents:
- Storage used: ~36 MB/year (text only — photos go to Cloudinary)
- Free tier: 500 MB → sufficient for 13+ years at this rate
- Compute: ~5 hours/month → well within 191 free compute hours/month
- Connections: Neon supports 100 concurrent connections on free tier
  - Prisma uses a connection pool — no risk of exhaustion with 50 agents

---

## Branches for Development (Optional)

Neon supports "database branches" — like Git branches for your DB.
You can create a `dev` branch for local development so you don't touch production data:

1. In Neon dashboard → "Branches" → "New Branch" → name it `dev`
2. Get the connection string for the `dev` branch
3. Use `dev` branch URL in `.env`, keep production branch URL for Vercel environment variables

This is recommended but optional. Main branch is fine for now.

---

## Verification Summary

After this step, confirm:
- [ ] `apps/api/.env` has the Neon `DATABASE_URL`
- [ ] `npm run db:push` completed with no errors
- [ ] Prisma Studio shows all 4 tables

**✓ Phase 1, File 01 complete. Proceed to `02_api/00_fastify_server.md`.**
