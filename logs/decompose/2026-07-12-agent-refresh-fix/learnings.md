# Decompose Learnings: Agent Data Refresh Loop Fix

## What Was Verified
1. **Unstable Dependency in `useCallback` Hooks**:
   - `useAuth().getToken` from Clerk is reference-unstable and returns a new function on every render or state change.
   - List pages (`PropertyList.tsx`, `LabourList.tsx`, `ShopList.tsx`, `ProjectList.tsx`) defined `fetchX` inside a `useCallback` depending on `[getToken]`.
   - The main `useEffect` for data loading depended on `[fetchX]`.
   - As a result, any state update (e.g. toggling a loading state) triggered a re-render, which generated a new `getToken` reference, causing `fetchX` to rebuild, which caused `useEffect` to trigger again, initiating an infinite fetch loop.
2. **Unstable Dependency in `useEffect` Hooks**:
   - In `Profile.tsx`, the `useEffect` to fetch stats depended directly on `[getToken]`.
   - In `App.tsx`, the `useEffect` to set up background sync and global token helper depended directly on `[getToken]`.
   - Both effects were running on every render because of the reference instability.

## Debunked Assumptions
- *Assumption*: Clerk's `getToken` is referentially stable or doesn't change after authentication is established.
- *Fact*: Clerk React SDK's hook outputs, particularly helper functions like `getToken`, change references across updates, which makes them unsafe to use directly in React hook dependency arrays without ref wrappers.

## Corrected Behavior
- By wrapping `getToken` in a `useRef` at the top of components/pages, we maintain a stable reference (`getTokenRef`) that holds the latest function.
- We then update `getTokenRef.current` whenever `getToken` changes in a minor effect, while the actual fetching callback/effect depends on nothing (`[]`) or only stable values (like `isSignedIn`), ensuring they only run on initial mount (or when sign-in state transitions).
