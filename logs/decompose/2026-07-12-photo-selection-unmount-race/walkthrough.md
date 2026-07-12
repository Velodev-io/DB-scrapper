# Walkthrough: Resolved Photo Selection Event Cancellation

## Root Cause
When the option buttons on our custom bottom sheet were clicked, they triggered a synchronous state change `setShowPicker(false)` which caused React to instantly unmount the modal and the buttons.
On iOS Safari, modifying the active DOM tree at the exact same execution tick where a programmatic `.click()` event is triggered on an input cancels the file input context, preventing the browser from firing the subsequent `change` event once the user selects a photo.

## Changes Applied
1. **Deferred Closing**: We removed `setShowPicker(false)` from the option buttons. The picker is now kept in the DOM while the native chooser runs and is cleanly hidden inside the `handleFiles` callback once the file upload is initiated.
2. **Looped Clicks Blocked**: To avoid focus restoration loops when the native chooser closes, we synchronously call `.blur()` on the clicked button and block duplicate triggers via a 1-second debounce ref (`clickInProgressRef`).
