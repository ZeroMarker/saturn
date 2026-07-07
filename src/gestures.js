import * as THREE from "three";
import { state, setGestureTarget, midpoint, distance, DEFAULT_VIEW } from "./state.js";

let gestureContext = null;
let handLandmarker = null;
let updateHud = null;

export function configureGestures(config) {
  gestureContext = config.gestureContext;
  updateHud = config.updateHud ?? (() => {});
}

export function getHandLandmarker() {
  return handLandmarker;
}

export function closeHandLandmarker() {
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

  try {
    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
    );
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    handLandmarker = await loadHandLandmarker(vision, filesetResolver);
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

  if (!hands.length) {
    state.mode = "待机";
    updateHud();
    return;
  }

  hands.forEach(drawHand);

  const primary = hands[0];
  const palm = midpoint(primary[0], primary[9]);
  const palmX = state.mirroredCamera ? 1 - palm.x : palm.x;
  setGestureTarget("targetRotationY", THREE.MathUtils.mapLinear(palmX, 0.18, 0.82, 1.15, -1.15));
  setGestureTarget("targetRotationX", THREE.MathUtils.mapLinear(palm.y, 0.18, 0.82, -0.42, 0.42));

  const pinch = distance(primary[4], primary[8]);
  if (pinch < 0.075) {
    setGestureTarget("targetScale", 1.55 - pinch * 7.5);
    state.mode = "捏合缩放";
  } else {
    state.mode = "手掌旋转";
  }

  if (hands.length > 1) {
    const a = midpoint(hands[0][0], hands[0][9]);
    const b = midpoint(hands[1][0], hands[1][9]);
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
      const x = normalizeGestureX(points[index].x) * width;
      const y = points[index].y * height;
      if (i === 0) gestureContext.moveTo(x, y);
      else gestureContext.lineTo(x, y);
    });
    gestureContext.stroke();
  });

  points.forEach((point, index) => {
    const radius = index === 4 || index === 8 ? 5 : 3;
    gestureContext.beginPath();
    gestureContext.arc(normalizeGestureX(point.x) * width, point.y * height, radius, 0, Math.PI * 2);
    gestureContext.fill();
  });
}

function normalizeGestureX(x) {
  return state.mirroredCamera ? 1 - x : x;
}
