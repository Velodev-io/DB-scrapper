# Carry Construction — Field Ops Tool
## Agent Prompt Files Index

> Give these files to Antigravity **one at a time**, in the order listed below.
> Each file is a self-contained instruction set. Complete one fully before moving to the next.
> Every file tells Antigravity exactly what to build, in what order, and how to verify it worked.

---

## Final Stack (All Decisions Locked)

| Service | Platform | URL |
|---|---|---|
| Agent Web App | Firebase Hosting | `carry-agent.web.app` |
| Admin Web App | Firebase Hosting | `carry-admin.web.app` |
| Fastify API | Vercel (serverless) | `carry-api.vercel.app` |
| Database | Neon (PostgreSQL free tier) | Neon dashboard |
| Image Storage | Cloudinary free tier | Cloudinary dashboard |
| Auth | Clerk (same account as main site) | Clerk dashboard |
| Error Monitoring | Sentry free tier | Sentry dashboard |
| Source Control + CI/CD | GitHub → auto-deploy | GitHub repo |

## Localhost Ports (Dev)

| Service | Port | URL |
|---|---|---|
| Fastify API | **4001** | http://localhost:4001 |
| Swagger UI | **4001** | http://localhost:4001/api/docs |
| Agent App | **5181** | http://localhost:5181 |
| Admin App | **5182** | http://localhost:5182 |

---

## Execution Order

Feed these to Antigravity **in this exact sequence**:

```
Phase 0 — Monorepo Bootstrap
  00_monorepo/
    00_scaffold.md              ← Init repo, workspaces, root scripts
    01_shared_package.md        ← Types, constants, API client, Cloudinary helpers

Phase 1 — Database
  01_database/
    00_prisma_schema.md         ← Full Prisma schema (Neon PostgreSQL)
    01_neon_setup.md            ← Create Neon project, get connection string

Phase 2 — API
  02_api/
    00_fastify_server.md        ← Server setup, Swagger, CORS, rate-limit
    01_auth_middleware.md       ← Clerk JWT middleware (requireAgent, requireAdmin)
    02_cloudinary_signing.md    ← Upload signing route + patch-queued route
    03_properties_routes.md     ← Agent + admin property routes
    04_projects_routes.md       ← Agent + admin project routes
    05_labour_routes.md         ← Agent + admin labour routes
    06_agents_routes.md         ← Admin agent management (invite, list, revoke)
    07_vercel_adapter.md        ← Wrap Fastify for Vercel serverless

Phase 3 — Image Upload System
  03_images/
    00_compress.md              ← Canvas API compression utility
    01_upload_manager.md        ← Worker pool state machine
    02_upload_queue_idb.md      ← IndexedDB offline queue (idb)
    03_service_worker.md        ← sw.js Background Sync flush
    04_photo_uploader_ui.md     ← PhotoUploader + PhotoCard components

Phase 4 — Agent App
  04_agent_app/
    UI_DESIGN_RULES.md          ← ⚠ READ THIS FIRST before any agent UI code
    00_design_system.md         ← CSS tokens, fonts, global styles
    01_app_shell.md             ← main.tsx, App.tsx, BottomNav, routing
    02_property_form.md         ← Full property form + localStorage persistence
    03_project_form.md          ← Construction project form
    04_labour_form.md           ← Labour profile form
    05_list_views.md            ← List views for all three sections
    06_profile_page.md          ← Profile + sync status

Phase 5 — Admin App
  05_admin_app/
    00_app_shell.md             ← main.tsx, sidebar layout, routing
    01_agents_page.md           ← Agent list + invite + revoke
    02_properties_inbox.md      ← Properties table + filters + detail
    03_projects_inbox.md        ← Projects table + filters + detail
    04_labour_inbox.md          ← Labour table + filters + detail

Phase 6 — Deployment
  06_deployment/
    00_clerk_setup.md           ← Clerk session token customization (role claim)
    01_neon_connect.md          ← Connect Neon DB, run prisma migrate deploy
    02_vercel_deploy.md         ← Deploy API to Vercel, set env vars
    03_firebase_deploy.md       ← Deploy agent + admin to Firebase Hosting via CLI
    04_github_ci.md             ← GitHub Actions for auto-deploy on push
    05_sentry_setup.md          ← Sentry error monitoring (API + both apps)
    06_concurrency_checklist.md ← 50-agent load readiness checklist
```

---

## How to Use These Files

1. Open the file for the current phase
2. Copy the **entire contents** and paste it to Antigravity as your prompt
3. Let Antigravity finish completely — it will create all the code, run commands, and verify
4. Once done, move to the next numbered file
5. Never skip a file — each one depends on the previous

---

## 50-Agent Concurrency Plan (Summary)

With 50 agents simultaneously:
- **Vercel** handles up to 100 concurrent serverless function invocations on the free tier — sufficient
- **Neon** free tier supports connection pooling via PgBouncer — Prisma's `@prisma/adapter-neon` uses it
- **Cloudinary** uploads go direct from browser to Cloudinary — never touch the Vercel function
- **Clerk** auth is JWT-verified locally — no Clerk API call per request (designed in auth middleware)
- **Firebase Hosting** is a CDN — serves the static apps to 1,000+ users simultaneously for free

Biggest risk: **Neon's 191 compute hours/month** limit. At 50 agents × 8 hours/day × 30 days = 12,000 agent-hours, but each request only uses the DB for ~5ms. Estimated DB compute: ~50 agents × 20 requests/hour × 5ms = 5 compute-hours/month. Well within limits.
