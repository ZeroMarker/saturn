import * as THREE from "three";

export const DEFAULT_VIEW = {
  rotationY: 0.45,
  rotationX: -0.12,
  scale: 1,
  tilt: THREE.MathUtils.degToRad(26.7),
};

export const LIMITS = {
  rotationX: [-0.8, 0.8],
  scale: [0.68, 1.7],
  tilt: [THREE.MathUtils.degToRad(-18), THREE.MathUtils.degToRad(72)],
};

export const state = {
  targetRotationY: DEFAULT_VIEW.rotationY,
  targetRotationX: DEFAULT_VIEW.rotationX,
  targetScale: DEFAULT_VIEW.scale,
  targetTilt: DEFAULT_VIEW.tilt,
  detected: false,
  mirroredCamera: true,
  mode: "待机",
  preset: "natural",
};

export function setGestureTarget(key, value, smoothing = 0.28) {
  if (key === "targetRotationX") {
    value = THREE.MathUtils.clamp(value, ...LIMITS.rotationX);
  } else if (key === "targetScale") {
    value = THREE.MathUtils.clamp(value, ...LIMITS.scale);
  } else if (key === "targetTilt") {
    value = THREE.MathUtils.clamp(value, ...LIMITS.tilt);
  }
  state[key] = THREE.MathUtils.lerp(state[key], value, smoothing);
}

export function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
