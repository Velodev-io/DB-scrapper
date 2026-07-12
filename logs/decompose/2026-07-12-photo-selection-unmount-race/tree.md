# Variable Tree: Selected photo is correctly added and displayed in the photo uploader

The objective is to ensure that selecting a photo from the gallery or camera on mobile successfully fires the `onChange` event, adds the photo to the state, and renders it on screen without focus loop or unmounting issues.

## Variables

- [ ] [Composite] Variable A: Photo is displayed in the list and uploads successfully after native selection
  - [ ] [Leaf] Variable A.1: The browser successfully fires the `onChange` handler of the file input (i.e. not canceled by DOM mutations during the click tick)
  - [ ] [Leaf] Variable A.2: Focus loops are prevented on mobile by blurring the active element and debouncing click events
  - [ ] [Leaf] Variable A.3: The selected files are processed and added to state via `addPhotos`
