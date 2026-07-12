# Variable Tree: Photo picker successfully uploads photo without loops or re-opening on mobile

The objective is that selecting a photo from the gallery or camera on a mobile phone successfully registers and uploads the photo on the website without re-opening the source picker or looping.

## Variables

- [ ] [Composite] Variable A: Photo selection completes and uploads successfully on mobile
  - [ ] [Leaf] Variable A.1: The source picker sheet closes immediately upon choosing a source (preventing duplicate click/focus loops when returning from the native picker)
  - [ ] [Leaf] Variable A.2: The native file input `onChange` handler receives the selected file and triggers the upload pipeline
  - [ ] [Leaf] Variable A.3: File validation correctly accepts HEIC/HEIF and standard gallery formats without rejecting them as non-image types
