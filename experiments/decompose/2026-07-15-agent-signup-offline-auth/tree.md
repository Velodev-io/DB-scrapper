# Objective

Native app (apps/agent-native) has no sign-up screen and unclear behavior when
offline at auth time — is this a real gap, or an intentional admin-provisioned
account model? And how does auth actually behave for an agent who is offline.

# Knowledge-base check

No `experiments/decompose/.graph/graph.json` or `graphify-out/graph.json`
exists in this repo. Prior investigation `2026-07-14-offline-patch-queued-race`
covers the offline sync queue, not auth — no overlap, no reusable citations.

# Variables

## VAR-1: Agent accounts are provisioned by an admin, not self-registered
- type: leaf
- sandbox: Read/Grep (static code tracing)
- expected: a POST endpoint exists that creates a Clerk user + local Agent
  row, gated to admins only, and no `SignUp` component exists anywhere in
  either app
- status: **CONFIRMED**
- evidence:
  - `apps/admin/src/pages/Agents.tsx:76-102` (`handleCreate`) — admin-only UI,
    POSTs `{ email, name, phone, age, role }` to `/agents`
  - `apps/api/src/routes/agents.ts:56` — `POST /agents` is
    `preHandler: requireAdmin`; body requires `email`, `name`, `role`
  - `apps/api/src/routes/agents.ts:90-99` — calls
    `clerk.users.createUser({ emailAddress, firstName, lastName,
    publicMetadata: { role } })` directly, no password passed
  - `grep -rn "SignUp\|signUp" apps/agent/src apps/agent-native` → zero
    matches in either app. No sign-up UI exists anywhere in the product.

## VAR-2: `clerk.invitations` exists but is read-only in this codebase
- type: leaf
- sandbox: Grep
- expected: either a `createInvitation` call exists (proper email-invite
  flow) or it doesn't (accounts get a password-less Clerk user with no
  onboarding email triggered by this code)
- status: **CONFIRMED — no creation call exists**
- evidence: `grep -n "invitations\.\|createInvitation" apps/api/src/routes/agents.ts`
  → only `clerk.invitations.getInvitationList({ status: 'pending' })` at
  line 44 (a read-only listing endpoint, `GET /agents/invitations`). No
  code path in this repo ever calls `clerk.invitations.createInvitation`.
  If invitations exist, they were created manually via the Clerk Dashboard,
  outside this codebase.

## VAR-3: Newly admin-created agents have no visible path to set an initial password in the native app
- type: leaf
- sandbox: Read
- expected: sign-in.tsx has some password-recovery/magic-link/sign-up
  affordance, or it doesn't
- status: **CONFIRMED — it doesn't**
- evidence: `apps/agent-native/app/sign-in.tsx` (full file read) is a bare
  email+password form calling `signIn.create({ identifier, password })`.
  No "Forgot password?" link, no email-code fallback, no sign-up link.
  `grep -n "forgot\|reset\|magic\|emailCode\|password"` finds only the
  password field itself.

## VAR-4 (composite, depends on VAR-3): Does the web app cover the gap?
- type: leaf
- sandbox: Read + **BLOCKED sub-check** (Clerk Dashboard config, not in this repo)
- expected: `apps/agent/src/App.tsx`'s `<SignIn routing="hash" />` is Clerk's
  full prebuilt component — whether it renders "Forgot password?" / sign-up
  links depends on the Clerk instance's Dashboard configuration (email/
  password strategy, sign-up enabled, password-reset enabled), which is
  **not visible from this codebase** — it's a hosted-component behavior
  driven by remote config.
- status: **PARTIALLY CONFIRMED / one sub-check blocked**
  - Confirmed: `apps/agent/src/App.tsx:132` uses Clerk's stock `<SignIn>`
    component with no `signUpUrl`/props suppressing default links — so
    *if* those features are enabled in the Clerk Dashboard, they'd appear
    on web automatically, with zero code changes needed here.
  - Blocked: cannot verify from code whether "Forgot password" and
    "sign-up" are actually enabled for this Clerk instance — that's a
    Dashboard setting only the user can check (Clerk Dashboard → User &
    Authentication → Email, Phone, Username / → Restrictions).

## VAR-5: Does a signed-in agent stay "signed in" while fully offline?
- type: leaf
- sandbox: Read (Clerk Expo SDK contract + this repo's token-cache wiring)
- expected: Clerk's own session state (used by `useAccessGate`) persists
  locally and doesn't require a live network call to report `isSignedIn`,
  separately from this app's own 55-minute JWT cache used only for
  background sync
- status: **CONFIRMED**
- evidence:
  - `apps/agent-native/lib/tokenCache.ts` — implements Clerk Expo's
    `TokenCache` interface backed by `expo-secure-store`; this is Clerk's
    own documented mechanism for persisting session state across app
    restarts without a network round-trip
    (`ClerkProvider tokenCache={tokenCache}` in `app/_layout.tsx`)
  - `apps/agent-native/hooks/useAccessGate.ts` (this session's own fix)
    reads `useAuth()`/`useUser()` directly — both backed by Clerk's cached
    session state, not by the app's separate `carry_jwt` cache
  - `apps/agent-native/lib/auth.ts` (`persistToken`/`loadPersistedToken`)
    is a **separate, app-level** JWT cache with a hardcoded 55-minute
    expiry, used *only* by `backgroundSync.ts`'s `TaskManager.defineTask`
    callback (which runs outside React context and can't call Clerk's
    `getToken()` hook directly) — this cache expiring does not sign the
    user out of the foreground app, it only stops the background-sync
    task from having a token to call the API with (which is moot anyway
    since background sync needs network regardless of token freshness).

# Conclusion

Not a bug. The product has no self-service sign-up anywhere (web or
native) — accounts are 100% admin-provisioned via `apps/admin`, and a
signed-in agent's session persists locally via Clerk's own SecureStore-
backed token cache, independent of network availability. Offline-first
record creation/queuing works from a cached session with no further auth
needed.

One real, unverified gap survives: newly admin-created agents (via the
`createUser` path the admin UI actually uses) get no password and no
onboarding email from this code — their only plausible way to set an
initial password is the web app's Clerk-hosted "Forgot password?" link,
*if* that's enabled in the Clerk Dashboard (unverifiable from code). See
handoff.md.
