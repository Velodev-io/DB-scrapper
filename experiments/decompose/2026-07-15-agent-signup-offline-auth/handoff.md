# Handoff — agent signup / offline auth investigation

Full detail in `tree.md` (variables + evidence) and `learnings.md`
(narrative). Short version below — verified facts only, no code written.

## Answers to the original questions

**"There's no sign-up option"** — correct, and intentional. Agent accounts
are created by an admin via `apps/admin`'s Agents page (→ `POST /agents`,
admin-only → `clerk.users.createUser`), never self-registered. This is true
on both web and native; nothing is missing from the native build
specifically.

**"How do agents log in / sign up when offline"** — they don't sign up
offline (impossible, sign-up doesn't exist). They *do* stay logged in
offline once they've signed in at least once while online — Clerk's own
`tokenCache` (SecureStore-backed) persists the session locally, so
`isSignedIn` survives app restarts and airplane mode with no network call.
Don't confuse this with the app's separate 55-minute `carry_jwt` cache in
`lib/auth.ts` — that one only feeds the background-sync task and expiring
it doesn't sign anyone out of the visible app.

## The one real gap (needs a product decision, not a code fix yet)

A freshly admin-created agent (via the path the admin UI actually uses,
`clerk.users.createUser` with no password) has no verified way to set an
initial password:
- Native `sign-in.tsx` has no "Forgot password" / magic-link fallback at all.
- Web's stock Clerk `<SignIn>` component *might* cover this via a Dashboard-
  configured "Forgot password?" link — but that depends on Clerk Dashboard
  settings not visible from this repo.

**Before writing any fix**, someone needs to check the Clerk Dashboard
(User & Authentication → Email, Phone, Username, and → Restrictions) to
confirm:
1. Is password-reset-by-email enabled for this instance?
2. Does the web `<SignIn>` component currently show a working "Forgot
   password?" link in practice?

If yes to both — the real gap is narrower than it looks: it's specifically
that **native has no password-reset path while web does**. The fix would be
adding Clerk's `useSignIn().create({ strategy: 'reset_password_email_code' })`
flow (or equivalent) to `apps/agent-native/app/sign-in.tsx`, mirroring
whatever web already gets for free from the hosted component.

If no to either — the gap is bigger: newly created agents currently have no
way to ever authenticate anywhere, on any platform, and the admin-provisioning
flow itself needs to either (a) switch to `clerk.invitations.createInvitation`
(sends a proper "set up your account" email — the endpoint already lists
pending invitations, it just never creates them), or (b) have the admin UI
capture/set an initial password directly.

Recommend the user check the Clerk Dashboard first — this determines which
of the two fixes above is the real one, and neither should be built on a
guess.
