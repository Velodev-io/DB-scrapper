# Variable Tree: Admin Agents Page Silent Polling

Primary Claim: `@carry/admin Agents page polls backend data silently every 5 seconds without showing the full page loading state or causing layout flickering.`

## Variables

- [x] [Composite] Variable A: `Agents.tsx` updates its agent list in the background every 5 seconds without page flickering.
  - [x] [Leaf] Variable A.1: Update `fetchAgents` to support a `silent` option.
  - [x] [Leaf] Variable A.2: Stabilize `getToken` using a `useRef` wrapper in `Agents.tsx`.
  - [x] [Leaf] Variable A.3: Invoke the background poll with `silent = true` in the interval.

## Test Plan

### Verification Criteria

#### Variable A (Silent Polling)
- **Action**: Open the Admin panel, navigate to the **Agents** tab.
- **PASS**:
  - The initial load displays the loading indicator, then shows the agents table.
  - Every 5 seconds, a network request is made to `/agents` and `/agents/invitations`.
  - The page content remains fully visible, interactive, and does NOT flicker or show "Loading..." during these background requests.
  - Any updates to the list (e.g. new agent added) are silently applied.
- **FAIL**:
  - The page blanks out or displays "Loading..." every 5 seconds when the poll triggers.
