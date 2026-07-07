import { initScene, resize as resizeScene, setPreset, startAnimation } from "./scene.js";
import {
  configureCamera,
  setHandDetectFunction,
  startCamera,
  handleVisibilityChange,
  isCameraOn,
} from "./camera.js";
import {
  configureGestures,
  initHandTracking,
  detectHands,
  applyGestureResult,
  closeHandLandmarker,
  clearGestureCanvas,
} from "./gestures.js";
import {
  video,
  sceneCanvas,
  gestureContext,
  configureUI,
  updateHud,
  setCameraButtonState,
  updateMode,
  updateTrackingLabel,
  resizeGestureCanvas,
  bindPointerFallback,
  bindPresetButtons,
  bindCameraButton,
  bindResetButton,
  setIsCameraOn,
} from "./ui.js";
import { state } from "./state.js";

// ─── 1. Initialize scene ─────────────────────────────────────
initScene(sceneCanvas);

// ─── 2. Configure gestures ───────────────────────────────────
configureGestures({
  gestureContext,
  updateHud,
});

// ─── 3. Configure camera with callbacks ──────────────────────
configureCamera({
  video,
  updateTrackingLabel,
  setCameraButtonState,
  updateMode,
  updateHud,
  onStreamReady: async () => {
    await initHandTracking();
  },
  onStreamEnd: () => {
    closeHandLandmarker();
    clearGestureCanvas();
  },
});

// Wire hand detection into the camera's frame loop
setHandDetectFunction((videoElement, time) => {
  const hands = detectHands(videoElement, time);
  applyGestureResult(hands);
});

// ─── 4. Configure UI callbacks ───────────────────────────────
configureUI({
  setPreset: (preset) => {
    state.preset = preset;
    setPreset(preset);
  },
  startCamera,
});

setIsCameraOn(isCameraOn);

// ─── 5. Bind events ──────────────────────────────────────────
window.addEventListener("resize", () => {
  resizeScene();
  resizeGestureCanvas();
});
document.addEventListener("visibilitychange", handleVisibilityChange);
bindCameraButton();
bindResetButton();
bindPresetButtons();
bindPointerFallback();

// ─── 6. Start ────────────────────────────────────────────────
resizeScene();
resizeGestureCanvas();
updateHud();
startAnimation();
