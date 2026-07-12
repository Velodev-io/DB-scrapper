# Variable Tree: Agent page static assets load too slowly

**Claim:** The agent app loads slowly because it ships one monolithic 405 kB JS chunk and forces the browser to parse/evaluate all routes eagerly before painting anything, while also blocking render on @fontsource font CSS imports.

---

## Test Plan

| Check | PASS | FAIL |
|---|---|---|
| Single JS chunk <= 100 kB? | Split | **405 kB monolith** |
| Clerk SDK in critical path? | Deferred | **Blocking** |
| Fonts loaded with display:swap? | Swap | **Block** |
| Route components lazy-loaded? | Yes | **No, all eager** |
| vite build uses manualChunks? | Yes | **No config at all** |

---

## Identified Problems (bottom-up)

### [Leaf] P1 — Monolithic 405 kB JS bundle (no code-splitting)
- All routes (PropertyForm, LabourForm, ShopForm, PropertyList...) are eagerly imported in App.tsx
- Clerk SDK (~120 kB gzipped), react-router, react-dom all land in one chunk
- Browser must parse ALL of it before first React paint

### [Leaf] P2 — @fontsource blocking CSS render
- 4 @import statements at top of index.css pull in ~30 font files
- Fraunces variable = 36 kB + 33 kB; Inter variable = 85 kB + 48 kB; IBM Plex Mono = 14+ files
- These are render-blocking in the CSS import chain
- font-display:swap is buried inside the @fontsource packages

### [Leaf] P3 — No vite build manual chunk splitting
- No rollupOptions.output.manualChunks = single 405 kB bundle
- Vendor libs (React, Clerk, react-router) bundled with app code = no long-term caching

### [Composite] First Contentful Paint is delayed by all three above

---

## Fixes

1. vite.config.ts — Add build.rollupOptions.output.manualChunks to split vendor/clerk/router
2. App.tsx — Lazy-load all route components with React.lazy() + Suspense
3. index.css — Remove blocking @fontsource imports, only keep latin subset woff2 with font-display:swap
4. index.html — Add preconnect for Clerk
