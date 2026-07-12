# Learnings: Trusted User Gesture Context in Mobile Browsers

## Root Cause Analysis
Mobile browsers (especially WebKit on iOS and Blink on Android) strictly require a **trusted user gesture** (direct synchronous stack from a click/tap event) to trigger file chooser dialogs programmatically via `.click()`.
- In our previous fix, we called `(e.currentTarget as HTMLButtonElement).blur()` and set up a timeout-based debounce.
- Calling `.blur()` programmatically changes the active element. WebKit and Chrome treat this as a loss of active user activation/gesture status.
- Consequently, the subsequent `input.click()` was flagged as an untrusted programmatic click, and the browser blocked the native file dialog from opening.

## Verified Solution
1. **Immediate Click dispatching**: Run the hidden input `.click()` *first* and *completely synchronously* in the event handler to preserve the trusted gesture.
2. **Order of Operations**: 
   ```typescript
   cameraInputRef.current?.click() // 1. Open picker under trusted gesture
   setShowPicker(false)             // 2. Hide sheet (React schedules render)
   ```
3. **No DOM Mutations before click**: Do not blur the active element or change React state before calling `.click()`.
