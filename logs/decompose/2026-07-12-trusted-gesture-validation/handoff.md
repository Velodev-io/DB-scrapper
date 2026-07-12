# Handoff: Synchronous Direct Input Click Fix

Modify `PhotoUploader.tsx` option buttons to dispatch the programmatic `.click()` synchronously as the first statement, followed by `setShowPicker(false)`. Do not use `.blur()` or timeouts.

## Proposed Code changes in `PhotoUploader.tsx`

```tsx
              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  cameraInputRef.current?.click() // Preservation of gesture context
                  setShowPicker(false)
                }}
              >
                ...
              </button>

              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  libraryInputRef.current?.click()
                  setShowPicker(false)
                }}
              >
                ...
              </button>

              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  filesInputRef.current?.click()
                  setShowPicker(false)
                }}
              >
                ...
              </button>
```
