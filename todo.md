# AR Saturn Gesture Lab Todo

## Current Status

- Live site: `https://zeromarker.github.io/saturn/`
- Deployment: GitHub Pages through `.github/workflows/deploy.yml`
- Build stack: Vite, npm-managed Three.js, runtime MediaPipe Tasks Vision CDN
- Remaining primary work: finish splitting `src/main.js` into focused modules.

## Phase 1: Stability

- [x] Pause hand tracking when the page is hidden.
  - Acceptance: `visibilitychange` stops detection while hidden and resumes when visible if AR was on.
- [x] Improve camera and MediaPipe failure states.
  - Acceptance: permission denial, missing camera, insecure context, model load failure, and stream interruption show distinct UI messages.
- [x] Handle camera track ending unexpectedly.
  - Acceptance: unplugging or revoking the camera resets the app to touch fallback without leaving stale UI state.
- [x] Make generated textures deterministic.
  - Acceptance: Saturn bands, ring noise, and stars render consistently across refreshes.

## Phase 2: Interaction

- [x] Add a reset-view control.
  - Acceptance: one click restores rotation, scale, tilt, and mode to defaults.
- [x] Smooth gesture input before applying it to the 3D model.
  - Acceptance: hand jitter is reduced without making controls feel laggy.
- [x] Add clear scale and tilt limits.
  - Acceptance: values remain bounded and HUD never displays impossible or unstable values.
- [x] Improve mobile control layout.
  - Acceptance: controls do not overlap on narrow screens and the main Saturn model remains the primary focus.

## Phase 3: Visual Quality

- [x] Improve Saturn ring detail.
  - Acceptance: rings show stronger banding, transparency variation, and a visible Cassini division.
- [x] Add a soft planet shadow across the rings.
  - Acceptance: ring depth reads clearly while preserving transparency.
- [x] Differentiate display presets.
  - Acceptance: natural, infrared, and eclipse modes each have visibly distinct lighting and color treatment.
- [x] Tune starfield density and depth.
  - Acceptance: background supports the planet without distracting from interaction.

## Phase 4: Engineering

- [x] Introduce Vite.
  - Acceptance: project has `package.json`, local dev server script, and production build script.
- [x] Move CDN dependencies into package-managed dependencies.
  - Acceptance: Three.js is installed through npm and imported from the bundled app.
- [ ] Split `src/main.js` into focused modules.
  - Acceptance: rendering, camera lifecycle, gesture handling, and UI state are separated.
  - Progress: procedural texture, shadow, and starfield generation moved to `src/procedural.js`.
  - Suggested split:
    - `src/scene.js`: renderer, scene, camera, lights, Saturn meshes, animation loop
    - `src/camera.js`: camera stream lifecycle and track interruption handling
    - `src/gestures.js`: MediaPipe loading, detection loop, landmark mapping
    - `src/ui.js`: HUD updates, controls, preset state, reset state
- [x] Add formatting and linting.
  - Acceptance: `npm run lint` or equivalent catches basic JavaScript issues.

## Phase 5: Publishing

- [x] Add deployment notes to `README.md`.
  - Acceptance: README explains local development, HTTPS requirement, and a static hosting option.
- [x] Add basic metadata.
  - Acceptance: page has description, theme color, and Open Graph metadata.
- [x] Validate production build.
  - Acceptance: production output serves correctly from a static server.

## Suggested Execution Order

1. Finish Phase 4 module split.
2. Add browser-level visual smoke checks if Playwright or Chromium becomes available.
3. Consider replacing runtime MediaPipe CDN with package-managed assets if offline or stricter supply-chain control becomes important.
