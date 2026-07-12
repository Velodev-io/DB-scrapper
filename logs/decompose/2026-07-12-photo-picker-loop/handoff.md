# Handoff: Photo Picker Looping Bug Fix

Modify `PhotoUploader.tsx` to close the picker modal synchronously *before* triggering the file input clicks and stop event propagation.

## Proposed Code Modification in `PhotoUploader.tsx`

```tsx
            <div className="photo-picker-options">
              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPicker(false)
                  cameraInputRef.current?.click()
                }}
              >
                ...
              </button>

              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPicker(false)
                  libraryInputRef.current?.click()
                }}
              >
                ...
              </button>

              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPicker(false)
                  filesInputRef.current?.click()
                }}
              >
                ...
              </button>
            </div>
```
