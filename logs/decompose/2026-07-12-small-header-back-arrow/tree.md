# Variable Tree: Small Header Back Arrow next to Page Titles

The objective is to replace the centered back buttons in the creation forms with a standard header back arrow (`←`) positioned to the left of the page titles, and add the same back arrow navigation to the list pages (`My Properties`, `My Labour`, `My Shops`) so agents can easily navigate back to the Profile page or previous screen.

## Variable Tree

- [x] [Composite] Variable A: Header back arrow on list pages
  - [x] [Leaf] Variable A.1: Update `apps/agent/src/pages/Properties/PropertyList.tsx` to include `←` back button next to `My Properties` title
  - [x] [Leaf] Variable A.2: Update `apps/agent/src/pages/Labour/LabourList.tsx` to include `←` back button next to `My Labour` title
  - [x] [Leaf] Variable A.3: Update `apps/agent/src/pages/Shops/ShopList.tsx` to include `←` back button next to `My Shops` title
- [x] [Composite] Variable B: Replace centered back button on form pages with header back arrow
  - [x] [Leaf] Variable B.1: Update `apps/agent/src/pages/Properties/PropertyForm.tsx` to remove centered button and place header back arrow next to title
  - [x] [Leaf] Variable B.2: Update `apps/agent/src/pages/Labour/LabourForm.tsx` to remove centered button and place header back arrow next to title
  - [x] [Leaf] Variable B.3: Update `apps/agent/src/pages/Shops/ShopForm.tsx` to remove centered button and place header back arrow next to title
