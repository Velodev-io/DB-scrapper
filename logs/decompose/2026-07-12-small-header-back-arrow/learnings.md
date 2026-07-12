# Decompose Learnings: Standard Mobile-first Header Back Arrow Layout

## Verified Claims

1. **Standard Header Back Arrow (←)**:
   - **Requirement**: Remove the centered block buttons from the forms. Instead, place a standard small back arrow button (`←`) aligned on the left of the page titles.
   - **Verification**: Removed the centered block buttons from `PropertyForm.tsx`, `LabourForm.tsx`, and `ShopForm.tsx` and wrapped the title with a small back arrow next to it in a flex row container.
   - **Coverage**: Also added the header back arrow layout to `PropertyList.tsx`, `LabourList.tsx`, and `ShopList.tsx` so that when users navigate to these list pages from the Profile stats card, they can tap the back arrow to return to the Profile page instantly.
