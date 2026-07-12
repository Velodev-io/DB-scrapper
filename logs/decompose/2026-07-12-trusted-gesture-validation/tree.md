# Variable Tree: Trusted gesture user activation for native file dialogs

The objective is to ensure that clicking options in the custom sheet successfully opens the native camera/picker dialog on all mobile browsers by maintaining a trusted user gesture context, and closes the sheet cleanly afterwards.

## Variables

- [ ] [Composite] Variable A: Native picker opens and processes photo selection successfully on mobile
  - [ ] [Leaf] Variable A.1: The `.click()` trigger remains in a synchronous, trusted user gesture context (no `.blur()` or DOM mutation before click)
  - [ ] [Leaf] Variable A.2: Focus loops are prevented by unmounting the sheet *after* the programmatic click is dispatched
  - [ ] [Leaf] Variable A.3: File inputs correctly fire `onChange` and update the view with thumbnails
