# UI Design Rules — Agent App (Field Ops Tool)

> **Antigravity Instructions:** Read this file completely before writing a single line of CSS or JSX for the agent app. These are non-negotiable design constraints. Violating any of them means a redo.

---

## The Goal in One Line

Build a tool that feels like a **premium, hand-crafted field app** — not a generic SaaS product, not a React tutorial template, not something that screams "AI made this".

---

## Hard Rules

### 1. Mobile-First. No Exceptions.

Every element is designed for a 375px wide screen first. Desktop is irrelevant for the agent app — agents are in the field on phones.

- Use `min-width` media queries only (never `max-width` to patch mobile as an afterthought)
- Touch targets: minimum **48×48px** on every interactive element — buttons, chips, nav items, remove buttons
- Text must be readable without zooming: body text **16px minimum**
- No horizontal scroll on any screen width from 320px to 480px
- Input fields fill the full width — never side-by-side on mobile
- Padding: **1rem** on left/right, **1.25rem** top — tight but breathable

### 2. Do Not Look AI-Generated

The hallmarks of an AI-generated UI that you must actively avoid:

❌ **Do not use:** Gradient hero banners, glassmorphism cards, floating blobs, neon glow effects, blue/purple primary colors, rounded pill buttons on everything, "Start for free" CTA energy, emoji as primary icons inside content areas, card grids with identical heights, shadow stacks on shadows

✅ **Do use instead:**
- **Flat, ink-on-paper aesthetic** — the brand palette is warm, not tech-blue
- **Typographic hierarchy** — Fraunces for headings creates personality that generic SaaS lacks
- **Negative space** — let things breathe rather than packing the screen
- **Consistent rhythm** — same spacing unit (`0.25rem` multiples) throughout
- **Real status indicators** — monospaced IBM Plex Mono for metadata and status (makes it feel like a professional tool, not a consumer app)
- **Ochre as an accent only** — not the primary color of everything. Use it for active state, CTA buttons, and focus rings. Ink (#1C1B18) is the main color.

### 3. Minimal Animations — CSS Only, No JS Libraries

**Absolutely no:** Framer Motion, GSAP, AOS, lottie-react, or any animation JS library in the agent app. These add KB and block the main thread on low-RAM phones.

**Allowed animations (CSS only, `prefers-reduced-motion` aware):**

```css
/* ── Global animation budget ─────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── What you ARE allowed to animate ─────────────────────── */

/* Button state feedback — 150ms max */
.btn-primary { transition: background-color 0.15s ease, transform 0.1s ease; }
.btn-primary:active { transform: scale(0.97); }

/* Chip selection — colour swap only */
.chip { transition: background-color 0.15s, color 0.15s, border-color 0.15s; }

/* Input focus ring — no layout shift */
.form-input { transition: border-color 0.15s; }

/* Link/nav hover — colour only */
.nav-item { transition: color 0.15s; }
.sidebar-link { transition: color 0.12s, background-color 0.12s; }

/* Photo card overlay — opacity only (GPU composited, cheap) */
.photo-overlay { transition: opacity 0.2s; }

/* Page-level fade-in — ONE TIME, very subtle */
.page { animation: pageFadeIn 0.2s ease-out; }

@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Upload progress ring — SVG stroke-dasharray animation */
/* Already defined in PhotoCard. This is acceptable — it's a critical UX signal. */

/* Network banner slide */
.network-banner {
  transition: transform 0.3s ease-out;
}
```

**That's the full list.** Nothing else animates. If you feel the urge to add a parallax scroll, a morphing shape, or a hover tilt card — don't.

### 4. No Data-Heavy Visual Flourishes

The agent is often on 2G or 3G. Every visual decision must ask: **does this cost network bytes?**

❌ Do not use:
- Background images
- External image assets loaded over the network
- Web fonts loaded from Google Fonts CDN (already handled — use `@fontsource` which is self-hosted after first load)
- SVG icon libraries fetched at runtime (use emoji or inline SVG for the 3–4 icons needed)
- Any `url()` in CSS that makes a network request

✅ Do use:
- CSS gradients (0 bytes)
- CSS shapes and borders (0 bytes)
- Inline SVG for the upload progress ring only (already written)
- Emoji for nav icons (0 bytes, native to every phone)

### 5. Responsive — but for Phones

The agent app has one breakpoint: **480px**. At that width, everything should look identical to a 375px screen, just with a bit more margin on the sides.

```css
/* Only breakpoint needed for agent app */
@media (min-width: 480px) {
  .page { padding-left: 1.5rem; padding-right: 1.5rem; }
}
```

No desktop layout. The app is never used on desktop by agents.

---

## What "Premium but Minimal" Looks Like

Think: a well-designed notebook, a architect's sketchpad, a Muji product.

**The feel:**
- Clean open space between elements
- Typography that has character (Fraunces headings) mixed with utility (Inter body, IBM Plex Mono labels)
- Warm paper tones (Bone, Sand) with dark ink
- One strong accent (Ochre) used sparingly
- Status is communicated through text + colour, never just icons alone

**Not:**
- Dark glassmorphism cards
- Purple gradients
- Rounded cards with drop shadows
- Bold hero text centered on screen
- Any element that makes you think "this looks like a landing page"

---

## Specific Implementation Notes for Antigravity

### Navigation
The bottom nav background is **#1C1B18 (Ink)**, not white. It gives a strong structural anchor at the bottom of the screen. Active items turn Ochre. Inactive items are Concrete (#8B857A).

### Forms
- Field labels use **IBM Plex Mono**, uppercase, small — they should look like metadata annotations, not consumer form labels
- Inputs use **Sand (#E7E0D3)** background, not white — it looks like paper and avoids the sterile white-input look
- On focus, border turns Ochre (#B87333) — a warm glow instead of the typical blue outline
- Error state: red border + small inline error text below the field (never a floating toast that covers inputs)

### Chip Selectors (Property Type, Listing Type, Gender, etc.)
- Default: transparent background, Concrete border and text
- Selected: Ink fill, no border, Bone text
- NOT: Tailwind-style blue pills, rounded-full pills for every element

```css
/* Correct chip — feels architectural */
.chip {
  padding: 0.5rem 1rem;
  border-radius: 4px;         /* Small radius, not pill */
  border: 1.5px solid var(--concrete);
  background: transparent;
  color: var(--concrete);
  font-size: 0.875rem;
}

.chip.active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bone);
}
```

### Cards (List Views)
- White card on Bone background — gives clean separation without shadow theatrics
- One pixel border in Sand (#E7E0D3) — subtle enough to not dominate
- Thumbnail on the left (72×72px), text on the right
- Metadata in IBM Plex Mono at 0.7rem

### Submit Button
- Full width, 52px height, Ink background, Bone text
- When loading: background fades to Concrete, text shows spinner character (`⏳`) or a simple CSS spinner
- Never disabled + greyed out for a long time — show loading state immediately on tap

### The One Exception — Upload Progress Ring
The circular SVG progress ring on photo cards IS an animation and it IS intentional. It's the most important UX signal in the app (tells the agent their photo is uploading). It uses SVG `stroke-dasharray` which is GPU-composited and uses 0ms CPU on mid-range phones.

---

## Admin App — Different Rules

The admin app (`apps/admin`) has **no low-end device or low-network constraints**. Admins are on desktop browsers with good internet.

For the admin app, you can use:
- Richer hover effects (column sort indicators, row highlights)
- Smooth drawer/modal animations (still CSS, but can be 250–300ms)
- More generous spacing (desktop has room)
- Heavier drop shadows on modals

But still: no gradient blobs, no glassmorphism, same brand palette. It should feel like the same product family as the agent app — just optimised for data density on desktop.

---

## Final Check Before Committing UI Code

Before submitting any agent app UI work, answer these:

1. **Would a field agent on a Redmi 9 with 2 GB RAM be able to use this comfortably?** (tap targets large enough, no janky animations)
2. **Does it look like a specific, intentional design choice was made?** (not a Bootstrap/shadcn clone)
3. **Is every animation CSS-only and under 200ms?**
4. **Is any image or external asset loaded over the network for UI decoration?** (answer must be: no)
5. **Does the Fraunces font show in headings?** (if you see system-serif or Inter everywhere, fonts didn't load)
6. **Does it pass the "this looks AI generated" check?** (show it to a designer — would they say "ah, this has personality"?)

If any answer is wrong, fix it before moving on.
