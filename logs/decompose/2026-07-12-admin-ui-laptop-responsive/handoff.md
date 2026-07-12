# Handoff: Laptop View Layout Overflow Fix

## Summary of Changes
Adjusted `.shell` layout grid and table wrapper scrolling behaviors inside [index.css](file:///Users/binova/Documents/Projects/Suru/Data%20collection/apps/admin/src/index.css):

```diff
 .shell {
   display: grid;
-  grid-template-columns: var(--sidebar-width) 1fr;
+  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
   grid-template-rows: var(--topbar-height) 1fr;
   min-height: 100vh;
 }
```

```diff
 .data-table-wrap {
   background: var(--white);
   border-radius: 10px;
   border: 1px solid var(--sand);
-  overflow: hidden;
+  overflow-x: auto;
 }
```

## Live Deployment
- **URL**: [https://carry-admin-suryansh.web.app](https://carry-admin-suryansh.web.app)
- The page is now fully contained horizontally, and wide tables support native horizontal scrolling within their wrapper.
