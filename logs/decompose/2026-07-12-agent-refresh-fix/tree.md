# Variable Tree: Agent List Views and Profile Page Fetch Data Only Once on Mount

Primary Claim: `@carry/agent list views and Profile page fetch data only once on mount and not on every render when Clerk auth's getToken function reference updates.`

## Variables

- [x] [Composite] Variable A: List pages (Properties, Labour, Shops, Projects) only fetch data once on mount, rather than refreshing on every render.
  - [x] [Leaf] Variable A.1: `PropertyList` refactoring (stabilizing fetch dependency array).
  - [x] [Leaf] Variable A.2: `LabourList` refactoring (stabilizing fetch dependency array).
  - [x] [Leaf] Variable A.3: `ShopList` refactoring (stabilizing fetch dependency array).
  - [x] [Leaf] Variable A.4: `ProjectList` refactoring (stabilizing fetch dependency array).
- [x] [Leaf] Variable B: `Profile` page only fetches stats once on mount instead of on every render.
- [x] [Leaf] Variable C: `App.tsx` background synchronization runs only when signed in, rather than on every render.

## Test Plan

### Verification Criteria

#### Variable A (List Views)
- **Action**: Navigate to any list page (e.g. `My Properties`, `My Labour`, `My Shops`). Perform normal interactions (e.g. click list items to open modals, trigger state changes).
- **PASS**: The network tab shows only 1 API request to the backend for the list (page 1) on initial mount, and does NOT trigger new requests when interacting or re-rendering.
- **FAIL**: Multiple identical list fetch API calls are observed in the network console during normal interactions or on state updates.

#### Variable B (Profile Page)
- **Action**: Navigate to the Profile tab.
- **PASS**: The network tab shows exactly 1 set of API queries to fetch stats (properties, labour, shops) on mount.
- **FAIL**: Multiple duplicate statistics queries are sent on every render or profile interaction.

#### Variable C (App Background Sync)
- **Action**: Sign in and load the application.
- **PASS**: `flushUploadQueueForeground` and `flushPendingRecordsForeground` are invoked only once when the user sign-in state transitions to active.
- **FAIL**: The background sync functions run on every single React render.
