# Learnings — agent signup / offline auth

## The missing sign-up screen is intentional, not a bug

There is no self-service sign-up anywhere in this product — not in
`apps/agent` (web) and not in `apps/agent-native` (native). Agent accounts
are 100% admin-provisioned:

1. An admin opens `apps/admin` → Agents page → "Create Agent," entering the
   new agent's email/name/phone/age/role.
2. That POSTs to `apps/api`'s `POST /agents` (admin-only), which calls
   `clerk.users.createUser(...)` directly — creating the Clerk account
   server-side, no self-registration involved.
3. The agent then just **signs in** (never signs up) on whichever app they
   use, once their account exists.

This matches a controlled-workforce access model (only vetted field agents
get accounts) rather than a public product — the missing sign-up screen in
`apps/agent-native/app/sign-in.tsx` is working as designed.

## Offline auth: sign-in itself needs network once; staying signed in doesn't

- **First-ever sign-in requires connectivity** — `signIn.create()` is a
  network call to Clerk, no way around that for the very first login on a
  device.
- **After that, the session persists offline.** `@clerk/clerk-expo`'s
  `tokenCache` (backed by `expo-secure-store`, wired in
  `apps/agent-native/lib/tokenCache.ts`) is Clerk's own mechanism for
  surviving app restarts without a network round-trip — `useAuth()` /
  `useUser()` (which `useAccessGate` reads) reflect this cached session.
  An agent who signed in once while online can keep using the app --
  including creating/queuing new offline records — indefinitely offline,
  until Clerk's own session lifetime expires (a Clerk Dashboard setting,
  not something this codebase controls).
- **Don't confuse this with the separate `carry_jwt` cache** in
  `apps/agent-native/lib/auth.ts` — that one has a hardcoded 55-minute
  expiry and exists *only* so the background-sync `TaskManager` task (which
  runs outside React and can't call Clerk's `getToken()` hook) has
  something to send as a Bearer token. Its expiry doesn't sign anyone out
  of the foreground app; it just means background sync silently no-ops
  until the app is reopened and the token gets refreshed again (harmless,
  since background sync needs network anyway).

## One real gap, not fully verifiable from code

`clerk.users.createUser()` (the path the admin UI actually exercises) is
called with **no password** and no invitation email triggered by this
codebase (`clerk.invitations.createInvitation` is never called anywhere —
only a read-only `getInvitationList` exists). So a freshly admin-created
agent has an account that exists in Clerk but has no way to authenticate
into it yet.

`apps/agent-native/app/sign-in.tsx` has zero password-recovery affordance
(no "Forgot password?" link, no magic-link/email-code option) — a new agent
literally cannot get past this screen on the native app.

The web app (`apps/agent/src/App.tsx`) uses Clerk's stock `<SignIn>`
component, which *may* auto-render a "Forgot password?" link depending on
the Clerk instance's Dashboard configuration (Email/Password strategy +
password-reset enabled) — but that's a remote config setting invisible from
this repo, so I can't confirm it's actually the working onboarding path
without checking the Clerk Dashboard directly.
