# Phase 0 — File 00: Scaffold the Monorepo

> **Antigravity Instructions:** Execute every step in order. Do not skip. Run all terminal commands. Verify each step before proceeding.

---

## What You Are Building

A new npm workspaces monorepo at `/Users/binova/Documents/Projects/Suru/Data collection/` called `carry-field-ops`. This is completely separate from the existing Real-Estate website repo.

The final folder structure will be:
```
carry-field-ops/
├── apps/
│   ├── agent/      ← Port 5181 (React + Vite + TailwindCSS v4)
│   ├── admin/      ← Port 5182 (React + Vite + TailwindCSS v4)
│   └── api/        ← Port 4001 (Fastify + TypeScript)
├── packages/
│   └── shared/     ← Types, constants, API client
├── package.json    ← Root workspaces + concurrently
└── .gitignore
```

---

## Step 1: Create Root package.json

Create `/Users/binova/Documents/Projects/Suru/Data collection/package.json`:

```json
{
  "name": "carry-field-ops",
  "private": true,
  "version": "0.1.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently -k -n api,agent,admin -c blue,green,magenta \"npm run dev -w apps/api\" \"npm run dev -w apps/agent\" \"npm run dev -w apps/admin\"",
    "dev:api":   "npm run dev -w apps/api",
    "dev:agent": "npm run dev -w apps/agent",
    "dev:admin": "npm run dev -w apps/admin",
    "build": "npm run build -w apps/agent && npm run build -w apps/admin",
    "db:push":   "npm run prisma:push -w apps/api",
    "db:studio": "npm run prisma:studio -w apps/api",
    "db:migrate": "npm run prisma:migrate -w apps/api"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

---

## Step 2: Create .gitignore

Create `/Users/binova/Documents/Projects/Suru/Data collection/.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.db
*.db-journal
.DS_Store
.vercel
.firebase
```

---

## Step 3: Scaffold apps/agent

Run these commands from `/Users/binova/Documents/Projects/Suru/Data collection/`:

```bash
mkdir -p apps/agent
cd apps/agent
```

Create `apps/agent/package.json`:

```json
{
  "name": "@carry/agent",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5181 --strictPort",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5181"
  },
  "dependencies": {
    "@carry/shared": "*",
    "@clerk/clerk-react": "^5.31.0",
    "@fontsource-variable/fraunces": "^5.2.9",
    "@fontsource-variable/inter": "^5.2.8",
    "@fontsource/ibm-plex-mono": "^5.2.7",
    "@tailwindcss/vite": "^4.3.2",
    "idb": "^8.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "tailwindcss": "^4.3.2"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Create `apps/agent/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5181,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
})
```

Create `apps/agent/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `apps/agent/tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Create `apps/agent/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

Create `apps/agent/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1C1B18" />
    <meta name="description" content="Carry Construction — Field Agent App" />
    <title>Carry Field</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create placeholder `apps/agent/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Carry Field Agent — Scaffold OK ✓</h1>
      <p>Port 5181</p>
    </div>
  </StrictMode>
)
```

Create placeholder `apps/agent/src/index.css`:

```css
/* Placeholder — design system added in Phase 4 */
```

---

## Step 4: Scaffold apps/admin

Create `apps/admin/package.json`:

```json
{
  "name": "@carry/admin",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5182 --strictPort",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5182"
  },
  "dependencies": {
    "@carry/shared": "*",
    "@clerk/clerk-react": "^5.31.0",
    "@fontsource-variable/fraunces": "^5.2.9",
    "@fontsource-variable/inter": "^5.2.8",
    "@fontsource/ibm-plex-mono": "^5.2.7",
    "@tailwindcss/vite": "^4.3.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "tailwindcss": "^4.3.2"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Create `apps/admin/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5182,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
})
```

Copy the same `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` structure as the agent app.

Create `apps/admin/index.html` (same structure as agent, title: "Carry Admin"):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Carry Construction — Admin Dashboard" />
    <title>Carry Admin</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create placeholder `apps/admin/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Carry Admin — Scaffold OK ✓</h1>
      <p>Port 5182</p>
    </div>
  </StrictMode>
)
```

---

## Step 5: Scaffold apps/api

Create `apps/api/package.json`:

```json
{
  "name": "@carry/api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@clerk/backend": "^1.24.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@fastify/swagger": "^9.4.0",
    "@fastify/swagger-ui": "^5.2.0",
    "@prisma/client": "^6.0.0",
    "@sentry/node": "^8.0.0",
    "fastify": "^5.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create placeholder `apps/api/src/server.ts`:

```typescript
import Fastify from 'fastify'

const PORT = Number(process.env.PORT ?? 4001)

async function main() {
  const app = Fastify({ logger: true })

  app.get('/health', async () => ({ ok: true, service: 'carry-api', port: PORT }))

  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`API running at http://localhost:${PORT}`)
  app.log.info(`Swagger UI at http://localhost:${PORT}/api/docs`)
}

main().catch(err => { console.error(err); process.exit(1) })
```

Create `apps/api/.env.example`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/carry_field_ops?sslmode=require"
PORT=4001
CORS_ORIGIN="http://localhost:5181,http://localhost:5182"
CLERK_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=carry-construction
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Step 6: Scaffold packages/shared

Create `packages/shared/package.json`:

```json
{
  "name": "@carry/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Create placeholder `packages/shared/src/index.ts`:

```typescript
// Shared package — populated in Phase 0 File 01
export const CARRY_VERSION = '0.1.0'
```

---

## Step 7: Install All Dependencies

From `/Users/binova/Documents/Projects/Suru/Data collection/` run:

```bash
npm install
```

This installs all workspace packages in one go.

---

## Step 8: Create apps/agent/.env and apps/admin/.env

Create `apps/agent/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_PLACEHOLDER
VITE_API_BASE=http://localhost:4001/api/v1
VITE_CLOUDINARY_CLOUD_NAME=carry-construction
```

Create `apps/admin/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_PLACEHOLDER
VITE_API_BASE=http://localhost:4001/api/v1
VITE_CLOUDINARY_CLOUD_NAME=carry-construction
```

Create `apps/api/.env` (copy from `.env.example`, fill in real values later):

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=4001
CORS_ORIGIN="http://localhost:5181,http://localhost:5182"
CLERK_SECRET_KEY=sk_test_PLACEHOLDER
CLOUDINARY_CLOUD_NAME=carry-construction
CLOUDINARY_API_KEY=PLACEHOLDER
CLOUDINARY_API_SECRET=PLACEHOLDER
```

---

## Verification

Run this command and confirm all three services start:

```bash
npm run dev
```

Expected output:
```
[api]   API running at http://localhost:4001
[agent] VITE v6.x.x  ready in xxx ms ➜ Local: http://localhost:5181/
[admin] VITE v6.x.x  ready in xxx ms ➜ Local: http://localhost:5182/
```

Also verify:
- `http://localhost:4001/health` → `{ "ok": true, "service": "carry-api", "port": 4001 }`
- `http://localhost:5181` → "Carry Field Agent — Scaffold OK ✓"
- `http://localhost:5182` → "Carry Admin — Scaffold OK ✓"

**✓ Phase 0, File 00 complete. Proceed to `01_shared_package.md`.**
