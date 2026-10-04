import * as THREE from "three";
import { state, setGestureTarget, midpoint, distance, DEFAULT_VIEW } from "./state.js";
import { projectVideoPoint } from "./video-layout.js";

let gestureContext = null;
let handLandmarker = null;
let updateHud = null;
let updateTrackingLabel = null;
let trackingGeneration = 0;
let videoElement = null;
let pinchSession = null;

export function configureGestures(config) {
  pinchSession = null;
  gestureContext = config.gestureContext;
  videoElement = config.video ?? null;
  updateHud = config.updateHud ?? (() => {});
  updateTrackingLabel = config.updateTrackingLabel ?? (() => {});
}

export function getHandLandmarker() {
  return handLandmarker;
}

export function closeHandLandmarker() {
  pinchSession = null;
  trackingGeneration += 1;
  handLandmarker?.close?.();
  handLandmarker = null;
}

export function clearGestureCanvas() {
  gestureContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

export async function loadHandLandmarker(vision, filesetResolver) {
  const modelAssetPath =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
  const options = {
    runningMode: "VIDEO",
    numHands: 2,
  };

  try {
    return await vision.HandLandmarker.createFromOptions(filesetResolver, {
      ...options,
      baseOptions: {
        modelAssetPath,
        delegate: "GPU",
      },
    });
  } catch (error) {
    console.warn("GPU hand tracking unavailable, falling back to CPU.", error);
    return vision.HandLandmarker.createFromOptions(filesetResolver, {
      ...options,
      baseOptions: {
        modelAssetPath,
        delegate: "CPU",
      },
    });
  }
}

export async function initHandTracking() {
  if (handLandmarker) return;
  const generation = ++trackingGeneration;

  try {
    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
    );
    if (generation !== trackingGeneration) return;
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    if (generation !== trackingGeneration) return;
    const landmarker = await loadHandLandmarker(vision, filesetResolver);
    if (generation !== trackingGeneration) {
      landmarker.close();
      return;
    }
    handLandmarker = landmarker;
  } catch (error) {
    error.name = "MediaPipeLoadError";
    throw error;
  }
}

export function detectHands(videoElement, time) {
  if (!handLandmarker) return [];
  const result = handLandmarker.detectForVideo(videoElement, time);
  return result.landmarks ?? [];
}

export function applyGestureResult(hands) {
  clearGestures();
  state.detected = hands.length > 0;
  updateTrackingLabel(hands.length ? `${hands.length} 只手已追踪` : "寻找手势");

  if (!hands.length) {
    pinchSession = null;
    state.mode = "待机";
    updateHud();
    return;
  }

  hands.forEach(drawHand);

  const palms = hands.map((hand) => {
    const point = projectVideoPoint(
      midpoint(hand[0], hand[9]), videoElement?.videoWidth, videoElement?.videoHeight,
      window.innerWidth, window.innerHeight, state.mirroredCamera,
    );
    return {
      x: THREE.MathUtils.clamp(point.x / window.innerWidth, 0, 1),
      y: THREE.MathUtils.clamp(point.y / window.innerHeight, 0, 1),
    };
  });
  // Screen order is stable even when the model swaps the two result entries.
  palms.sort((a, b) => a.x - b.x);
  const primary = hands[0];
  const palm = palms.length > 1 ? midpoint(palms[0], palms[1]) : palms[0];
  const palmX = palm.x;
  setGestureTarget("targetRotationY", THREE.MathUtils.mapLinear(palmX, 0.18, 0.82, 1.15, -1.15));
  setGestureTarget("targetRotationX", THREE.MathUtils.mapLinear(palm.y, 0.18, 0.82, -0.42, 0.42));

  const pinch = distance(primary[4], primary[8]);
  // A wider release threshold lets fingers open past the activation threshold
  // without dropping the zoom session or resetting its baseline.
  if (hands.length !== 1 || pinch >= 0.15) pinchSession = null;
  if (hands.length === 1 && !pinchSession && pinch < 0.075) {
    pinchSession = { distance: Math.max(pinch, 0.005), scale: state.targetScale };
  }
  if (pinchSession) {
    setGestureTarget("targetScale", pinchSession.scale * Math.max(pinch, 0.005) / pinchSession.distance);
    state.mode = "捏合缩放";
  } else {
    state.mode = "手掌旋转";
  }

  if (hands.length > 1) {
    const [a, b] = palms;
    const heightDelta = THREE.MathUtils.clamp((a.y - b.y) * 1.9, -0.78, 0.78);
    setGestureTarget("targetTilt", DEFAULT_VIEW.tilt + heightDelta);
    setGestureTarget("targetScale", 0.82 + distance(a, b) * 1.35);
    state.mode = "双手操控";
  }

  updateHud();
}

function clearGestures() {
  clearGestureCanvas();
}

function drawHand(points) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const projected = points.map((point) => projectVideoPoint(
    point, videoElement?.videoWidth, videoElement?.videoHeight,
    width, height, state.mirroredCamera,
  ));
  const chains = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [0, 9, 10, 11, 12],
    [0, 13, 14, 15, 16],
    [0, 17, 18, 19, 20],
    [5, 9, 13, 17],
  ];

  gestureContext.lineWidth = 2;
  gestureContext.strokeStyle = "rgba(117, 211, 255, 0.72)";
  gestureContext.fillStyle = "rgba(245, 193, 108, 0.92)";

  chains.forEach((chain) => {
    gestureContext.beginPath();
    chain.forEach((index, i) => {
      const { x, y } = projected[index];
      if (i === 0) gestureContext.moveTo(x, y);
      else gestureContext.lineTo(x, y);
    });
    gestureContext.stroke();
  });

  projected.forEach((point, index) => {
    const radius = index === 4 || index === 8 ? 5 : 3;
    gestureContext.beginPath();
    gestureContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
    gestureContext.fill();
  });
}
