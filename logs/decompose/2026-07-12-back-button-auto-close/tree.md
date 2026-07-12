# Variable Tree: Centered Back button on creation forms & auto-close details modal on save

The objective is to:
1. Add a centered back button at the top/header section on all creation forms (`PropertyForm`, `LabourForm`, `ShopForm`) so agents can easily navigate back.
2. Ensure details modals auto-close after successfully saving/editing the record (currently they stay open in view mode).

## Variable Tree

- [x] [Composite] Variable A: Centered Back button on creation forms
  - [x] [Leaf] Variable A.1: Add centered back button to `apps/agent/src/pages/Properties/PropertyForm.tsx`
  - [x] [Leaf] Variable A.2: Add centered back button to `apps/agent/src/pages/Labour/LabourForm.tsx`
  - [x] [Leaf] Variable A.3: Add centered back button to `apps/agent/src/pages/Shops/ShopForm.tsx`
- [x] [Composite] Variable B: Auto-close detail modal on successful edit save
  - [x] [Leaf] Variable B.1: Update `handleSaved` in `apps/agent/src/pages/Properties/PropertyList.tsx` to set `selectedProperty(null)`
  - [x] [Leaf] Variable B.2: Update `handleSaved` in `apps/agent/src/pages/Labour/LabourList.tsx` to set `selectedLabour(null)`
  - [x] [Leaf] Variable B.3: Update `handleSaved` in `apps/agent/src/pages/Shops/ShopList.tsx` to set `selectedShop(null)`
