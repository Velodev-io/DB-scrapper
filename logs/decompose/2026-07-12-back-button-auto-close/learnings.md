# Decompose Learnings: Centered Back button on creation forms & auto-close details modal on save

## Verified Claims

1. **Back Button Navigation on Creation Pages**:
   - **Requirement**: Add a centered back button at the top/header section on all creation forms (`PropertyForm`, `LabourForm`, `ShopForm`) so agents can easily abort/navigate back.
   - **Verification**: Placed a flex-centered back button (`← Back to <List>`) directly beneath the heading in `PropertyForm.tsx`, `LabourForm.tsx`, and `ShopForm.tsx`. This aligns perfectly on mobile screen layouts (480px) and provides simple, intuitive route navigation.

2. **Auto-close Details Modal on Save**:
   - **Requirement**: Close the slide-up modal automatically once the agent edits a record and saves the changes.
   - **Verification**: Previously, `handleSaved` in `PropertyList.tsx`, `LabourList.tsx`, and `ShopList.tsx` called `setSelected<Model>(updated)`, which kept the modal open in view mode. We modified these to call `setSelected<Model>(null)`, successfully closing the sheet upon a successful save.
