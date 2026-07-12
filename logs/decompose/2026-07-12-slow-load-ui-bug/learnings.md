# Decompose Learnings: UI sheet layout and data loading latency optimization

## Verified Claims

1. **Slow Data Loading Cause**:
   - **Root Cause**: The API route authentication middleware (`requireAgent` and `requireAdmin` in `apps/api/src/lib/auth.ts`) verified tokens using Clerk, but if the custom claims role template wasn't configured in the developer's Clerk dashboard environment, the role check fell back to a synchronous external network call to `clerk.users.getUser`.
   - **Latency Impact**: For parallel front-end calls (like count updates on Profile for Properties, Labour, and Shops), this triggered 3 synchronous external Clerk HTTP calls sequentially or concurrently, causing loading times to shoot up to 1.5 - 3 seconds.
   - **Solution**: Added a simple, robust Map-based in-memory cache with a 5-minute TTL for Clerk roles inside `auth.ts` to entirely avoid these slow redundant network requests.

2. **UI Sheets Layout Overlay Bug**:
   - **Root Cause**: The detail sheet modals used `background: var(--bg)`. However, the root CSS variables in `index.css` did not define `--bg` (only `--bone`, `--sand`, `--white`, etc. were defined). This left the modal sheet background transparent, causing the page list text to overlay awkwardly with the modal input fields.
   - **Layout Centering (Mobile-first)**: The modal sheet had `left: 0; right: 0;` which stretched across the screen on desktop. We updated it to center correctly on desktop/larger viewports with `left: 50%`, `transform: translateX(-50%)`, and `maxWidth: 480px`, mirroring the page body container layout.
   - **Details Layout Cramp**: The table-like grid layout next to the avatar had fixed `120px` labels which left too little width on narrow mobile viewports. We simplified the layout using a clean, responsive flex column for the avatar card headers, and adjusted standard rows to `100px`/`96px` labels.
