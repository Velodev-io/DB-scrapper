# Learnings: Mobile Focus/Click Loop on Programmatic File Inputs

## Root Cause Analysis
On mobile browsers (iOS Safari, Android Chrome), triggering `input.click()` programmatically from a button within a modal sheet leaves the modal button focused. When the native file chooser closes (whether the user clicked "Done" or "Cancel"), the browser restores focus to the previously active element (the modal button).
- On some mobile OS versions, restoring focus can emulate/re-trigger a `click` event on that button.
- This creates an infinite loop where returning from the gallery immediately re-opens the gallery or the source selection modal.
- Additionally, if the custom bottom sheet remains in the DOM while the native chooser is active, it does not clean up its state properly if the file input fires an early or empty change event.

## Solutions Tested & Confirmed
1. **Immediate Modal Unmounting**: By calling `setShowPicker(false)` synchronously inside the option button's `onClick` handler right *before* calling `input.click()`, we ensure that the modal sheet and its buttons are completely removed from the DOM by the time the user returns from the native chooser.
2. **Stop Propagation**: Calling `e.stopPropagation()` in the button's click handler prevents any bubbling issues.
3. **MIME/Extension Fallbacks**: Ensuring HEIC and empty MIME type files selected from the native gallery are parsed correctly via name extension checks.
