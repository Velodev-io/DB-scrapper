# Learnings: DOM Mutation Race Condition during Programmatic File Chooser

## Root Cause Analysis
In iOS Safari and mobile Chrome, programmatic invocation of `input.click()` must occur within a valid user gesture context.
- When `setShowPicker(false)` was called synchronously inside the button's `onClick`, React immediately scheduled a re-render to unmount the picker sheet.
- Because the DOM structure changed during the same execution tick as the file input trigger, the browser's security or event system dropped the connection to the input element or canceled the event propagation. This resulted in the native file picker opening but failing to fire the `onChange` event (or failing to return the file list to the browser context) once the user finished selecting a file.
- As a result, `handleFiles` was never executed, `addPhotos` was not called, and the selected photos were never added.

## Solution
1. **Defer Modal Closing**: Keep the modal sheet mounted while the native chooser is active. Close the sheet *only* inside the `handleFiles` callback (which fires when files are actually received).
2. **Prevent Focus/Click Loop via Blurring**: To prevent the mobile browser from re-triggering the click when focus is restored after the chooser closes, explicitly call `(e.currentTarget as HTMLButtonElement).blur()` inside the button's `onClick` handler.
3. **Click Debounce**: Use a simple local ref tracker to ignore rapid consecutive clicks.
