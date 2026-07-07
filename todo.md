# AR Saturn Gesture Lab Todo

## Current Status

- **All planned phases (1–5) are complete.**
- Live site: `https://zeromarker.github.io/saturn/`
- Deployment: GitHub Pages through `.github/workflows/deploy.yml`
- Build stack: Vite, npm-managed Three.js, runtime MediaPipe Tasks Vision CDN
- Module split done: `state.js`, `scene.js`, `camera.js`, `gestures.js`, `ui.js`, `main.js`
- Code quality tooling: ESLint (minimal config)

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
- [x] Split `src/main.js` into focused modules.
  - Acceptance: rendering, camera lifecycle, gesture handling, and UI state are separated.
  - Completed split:
    - `src/state.js`: shared state object, constants, utility functions
    - `src/scene.js`: Three.js renderer, scene, camera, lights, Saturn meshes, animation loop with delta-time
    - `src/camera.js`: camera stream lifecycle, frame-by-frame detection loop, track interruption handling
    - `src/gestures.js`: MediaPipe loading, hand landmarker, landmark-to-gesture mapping, skeleton drawing
    - `src/ui.js`: DOM references, HUD updates, preset/reset buttons, pointer fallback, event binding
    - `src/main.js`: thin entry point (92 lines) that wires modules together via callbacks
- [x] Add formatting and linting.
  - Acceptance: `npm run lint` catches no-unused-vars and console warnings.
- [x] Add delta-time based animation.
  - Acceptance: Saturn rotation speed is consistent across different frame rates.

## Phase 5: Publishing

- [x] Add deployment notes to `README.md`.
  - Acceptance: README explains local development, HTTPS requirement, and a static hosting option.
- [x] Add basic metadata.
  - Acceptance: page has description, theme color, and Open Graph metadata.
- [x] Validate production build.
  - Acceptance: production output serves correctly from a static server.

## Future Considerations

- **Browser-level visual smoke tests** — Add Playwright or similar if Chromium becomes available in the environment, to validate gesture→state→render pipeline without manual testing.
- **MediaPipe CDN → bundled assets** — Consider replacing runtime CDN imports with package-managed (`@mediapipe/tasks-vision`) for offline capability and stricter supply-chain control. Note that the WASM and model file must still be served statically by the browser.
- **Service Worker / PWA** — Add a service worker to cache Three.js bundle and assets for faster repeat visits and offline touch-fallback mode.
- **Animations / transitions** — Smooth the camera-on/camera-off state transitions, add a loading spinner during MediaPipe model download.
- **Multi-language HUD** — The HUD labels are currently hardcoded in Chinese; consider externalizing strings.
