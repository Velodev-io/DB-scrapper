# Phase 6 — File 04: GitHub Actions CI/CD

> **Antigravity Instructions:** Create the GitHub Actions workflow files. These run automatically on every push to main.

---

## What This Sets Up

```
Push to main branch on GitHub
        │
        ├─▶ Deploy API to Vercel (automatic via Vercel GitHub integration)
        │
        ├─▶ Build agent app → Deploy to Firebase Hosting (carry-agent.web.app)
        │
        └─▶ Build admin app → Deploy to Firebase Hosting (carry-admin.web.app)
```

---

## Step 1: Get Firebase CI Token

```bash
firebase login:ci
```

This prints a token like `1//xxxxx`. Copy it — needed for GitHub secrets.

---

## Step 2: Add GitHub Secrets (User Does This)

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

Add these secrets:

| Secret Name | Value |
|---|---|
| `FIREBASE_TOKEN` | Token from `firebase login:ci` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (pk_live_...) |
| `VITE_API_BASE` | `https://carry-api.vercel.app/api/v1` |
| `VITE_CLOUDINARY_CLOUD_NAME` | `carry-construction` |
| `FIREBASE_PROJECT_AGENT` | `carry-agent` |
| `FIREBASE_PROJECT_ADMIN` | `carry-admin` |

For Vercel: the Vercel GitHub integration handles auto-deploy automatically when you connect the repo in the Vercel dashboard — no additional secrets needed for the API.

---

## Step 3: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml` in the repo root:

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  # ── Deploy Agent App to Firebase ──────────────────────────────────────
  deploy-agent:
    name: Agent App → Firebase Hosting
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build agent app
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
          VITE_CLOUDINARY_CLOUD_NAME: ${{ secrets.VITE_CLOUDINARY_CLOUD_NAME }}
        run: npm run build -w apps/agent

      - name: Deploy to Firebase (Agent)
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_TOKEN }}
          projectId: ${{ secrets.FIREBASE_PROJECT_AGENT }}
          target: hosting
          entryPoint: apps/agent
          channelId: live

  # ── Deploy Admin App to Firebase ──────────────────────────────────────
  deploy-admin:
    name: Admin App → Firebase Hosting
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build admin app
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
          VITE_CLOUDINARY_CLOUD_NAME: ${{ secrets.VITE_CLOUDINARY_CLOUD_NAME }}
        run: npm run build -w apps/admin

      - name: Deploy to Firebase (Admin)
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_TOKEN }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ADMIN }}
          target: hosting
          entryPoint: apps/admin
          channelId: live
```

---

## Step 4: Connect Vercel to GitHub (For API Auto-Deploy)

1. Go to https://vercel.com/dashboard
2. Click `carry-api` project → Settings → Git
3. Connect repository → select your GitHub repo
4. Set Root Directory: `apps/api`
5. Build Command: `npm run build`
6. Install Command: `npm install`

From now on, Vercel auto-deploys the API on every push to `main`.

---

## Step 5: Test the Pipeline

```bash
git add .
git commit -m "feat: initial deploy pipeline"
git push origin main
```

Go to GitHub → Actions tab. You should see the workflow running.

Expected: both Firebase jobs complete green in ~3–4 minutes.
Vercel deploys the API automatically in ~2 minutes.

---

## Deployment Summary After Setup

| What changed | Who deploys it | How long |
|---|---|---|
| Any code pushed to `main` | GitHub Actions (auto) | ~3–4 min |
| API code changes | Vercel (auto via GitHub) | ~2 min |
| Manual deploy anytime | `npm run deploy:all` | ~5 min |

**✓ Phase 6, File 04 complete. Proceed to `06_deployment/05_sentry_setup.md`.**
