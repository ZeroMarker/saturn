import * as THREE from "three";
import { state } from "./state.js";

// DOM element references
export const video = document.querySelector("#cameraFeed");
export const stage = document.querySelector(".stage");
export const cameraButton = document.querySelector("#cameraButton");
export const cameraButtonLabel = document.querySelector("#cameraButtonLabel");
export const resetButton = document.querySelector("#resetButton");
export const gestureCanvas = document.querySelector("#gestureCanvas");
export const sceneCanvas = document.querySelector("#sceneCanvas");
export const modeLabel = document.querySelector("#modeLabel");
export const scaleLabel = document.querySelector("#scaleLabel");
export const tiltLabel = document.querySelector("#tiltLabel");
export const trackingLabel = document.querySelector("#trackingLabel");
export const trackingDot = document.querySelector("#trackingDot");
export const presetButtons = [...document.querySelectorAll("[data-preset]")];
export const gestureContext = gestureCanvas.getContext("2d");

let pointer = {
  active: false,
  x: 0,
  y: 0,
  lastX: 0,
  lastY: 0,
};

// Callbacks set by main.js
let setPresetCallback = null;
let startCameraCallback = null;

export function configureUI(config) {
  setPresetCallback = config.setPreset ?? (() => {});
  startCameraCallback = config.startCamera ?? (() => {});
}

export function getPointer() {
  return pointer;
}

export function updateHud() {
  modeLabel.textContent = state.mode;
  scaleLabel.textContent = `${state.targetScale.toFixed(2)}x`;
  tiltLabel.textContent = `${THREE.MathUtils.radToDeg(state.targetTilt).toFixed(1)}°`;
  trackingDot.classList.toggle("active", state.detected);
}

export function setCameraButtonState(isOn) {
  if (isOn === "starting") {
    cameraButtonLabel.textContent = "启动中";
    cameraButton.disabled = true;
    return;
  }
  const on = Boolean(isOn);
  cameraButtonLabel.textContent = on ? "关闭 AR" : "开启 AR";
  cameraButton.disabled = false;
  cameraButton.setAttribute("aria-label", on ? "关闭 AR 摄像头" : "开启 AR 摄像头");
  cameraButton.setAttribute("aria-pressed", String(on));
}

export function updateMode(mode) {
  state.mode = mode;
}

export function updateTrackingLabel(text) {
  trackingLabel.textContent = text;
}

export function resizeGestureCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  gestureCanvas.width = Math.floor(width * window.devicePixelRatio);
  gestureCanvas.height = Math.floor(height * window.devicePixelRatio);
  gestureCanvas.style.width = `${width}px`;
  gestureCanvas.style.height = `${height}px`;
  gestureContext.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

export function bindPointerFallback() {
  sceneCanvas.addEventListener("pointerdown", (event) => {
    pointer.active = true;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    sceneCanvas.setPointerCapture(event.pointerId);
  });

  sceneCanvas.addEventListener("pointermove", (event) => {
    if (!pointer.active) return;
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    state.targetRotationY += dx * 0.008;
    state.targetRotationX = THREE.MathUtils.clamp(
      state.targetRotationX + dy * 0.006,
      ...[-0.8, 0.8],
    );
    state.mode = "触控旋转";
    updateHud();
  });

  const endPointer = (event) => {
    pointer.active = false;
    if (sceneCanvas.hasPointerCapture(event.pointerId)) {
      sceneCanvas.releasePointerCapture(event.pointerId);
    }
  };

  sceneCanvas.addEventListener("pointerup", endPointer);
  sceneCanvas.addEventListener("pointercancel", endPointer);
  sceneCanvas.addEventListener("lostpointercapture", () => {
    pointer.active = false;
  });

  window.addEventListener(
    "wheel",
    (event) => {
      state.targetScale = THREE.MathUtils.clamp(
        state.targetScale - event.deltaY * 0.001,
        0.68,
        1.7,
      );
      state.mode = "滚轮缩放";
      updateHud();
    },
    { passive: true },
  );
}

export function bindPresetButtons() {
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      setPresetCallback(preset);
      presetButtons.forEach((btn) => {
        const isActive = btn.dataset.preset === preset;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
      });
    });
  });
}

export function bindCameraButton() {
  cameraButton.addEventListener("click", startCameraCallback);
}

export function bindResetButton() {
  resetButton.addEventListener("click", () => {
    state.targetRotationY = 0.45;
    state.targetRotationX = -0.12;
    state.targetScale = 1;
    state.targetTilt = THREE.MathUtils.degToRad(26.7);
    state.mode = isCameraOn() ? "手势待机" : "触控备用";
    updateHud();
  });
}

// isCameraOn needs to be provided by main.js
let isCameraOn = () => false;
export function setIsCameraOn(fn) {
  isCameraOn = fn;
}
