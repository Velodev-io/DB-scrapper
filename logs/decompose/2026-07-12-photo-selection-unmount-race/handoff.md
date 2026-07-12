# Handoff: Defer Close & Blur Option Fix

Modify `PhotoUploader.tsx` to:
1. Maintain modal state during input clicks.
2. Call `.blur()` on the option buttons to prevent the focus click loop.
3. Call `setShowPicker(false)` only when the native chooser completes (inside `handleFiles` or cancel).

## Proposed Code changes in `PhotoUploader.tsx`

```tsx
  const clickInProgressRef = useRef(false)

  // inside buttons
  onClick={(e) => {
    e.stopPropagation()
    if (clickInProgressRef.current) return
    clickInProgressRef.current = true
    
    // Blur the button so focus is lost and doesn't trigger loops
    ;(e.currentTarget as HTMLButtonElement).blur()
    
    cameraInputRef.current?.click()
    
    setTimeout(() => {
      clickInProgressRef.current = false
    }, 1000)
  }}
```
