# Walkthrough: Restoring Trusted Gesture for File Dialogs

## Findings & Changes
- Calling `.blur()` on the active button programmatically immediately cleared the browser's current active user activation context, leading WebKit and Chrome to treat subsequent `.click()` calls on hidden file inputs as untrusted programmatic events and blocking them.
- We fixed this by restoring the standard synchronous click chain. The first statement in the click handler is now `cameraInputRef.current?.click()` (preserving the direct, trusted gesture loop), followed immediately by `setShowPicker(false)`.
- Disabling `.blur()` ensures the native chooser launches successfully across all mobile operating systems.
- Build verifies clean output.
