# Decompose Learnings: Admin Agents Silent Polling Fix

## What Was Verified
1. **Flickering Due to Timed Polling and Loading State**:
   - The Admin panel's **Agents** page (`Agents.tsx`) runs a background polling routine every 5 seconds using `setInterval`.
   - The polling routine calls `fetchAgents()`, which sets `loading` state to `true` on every trigger.
   - When `loading` is set to `true`, the React component hides the table and displays a loading message. When the request finishes, it shows the table again. This caused high-frequency layout flickering every 5 seconds.
2. **Unstable Dependency Closures**:
   - The polling routine closes over the `fetchAgents` function from the mount render cycle.
   - `fetchAgents` reads Clerk's `getToken` hook output which changes on subsequent renders.
   
## Corrected Behavior
- Added a `silent = false` parameter to `fetchAgents`.
- Skipped setting `loading` state during background polling (silent mode enabled).
- Wrapped Clerk's `getToken` in `useRef` to maintain a stable reference and avoid stale closure warnings.
- The list now updates seamlessly in the background without layout flickering.
