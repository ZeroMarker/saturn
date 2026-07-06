import * as THREE from "three";
import {
  createRingShadowTexture,
  createRingTexture,
  createSaturnTexture,
  createStars,
} from "./procedural.js";

const video = document.querySelector("#cameraFeed");
const stage = document.querySelector(".stage");
const cameraButton = document.querySelector("#cameraButton");
const cameraButtonLabel = document.querySelector("#cameraButtonLabel");
const resetButton = document.querySelector("#resetButton");
const gestureCanvas = document.querySelector("#gestureCanvas");
const sceneCanvas = document.querySelector("#sceneCanvas");
const modeLabel = document.querySelector("#modeLabel");
const scaleLabel = document.querySelector("#scaleLabel");
const tiltLabel = document.querySelector("#tiltLabel");
const trackingLabel = document.querySelector("#trackingLabel");
const trackingDot = document.querySelector("#trackingDot");
const presetButtons = [...document.querySelectorAll("[data-preset]")];

const gestureContext = gestureCanvas.getContext("2d");
const pointer = {
  active: false,
  x: 0,
  y: 0,
  lastX: 0,
  lastY: 0,
};

const cameraSession = {
  stream: null,
  handLandmarker: null,
  detectAnimationId: 0,
  lastVideoTime: -1,
  starting: false,
  shouldResumeOnVisible: false,
};

const DEFAULT_VIEW = {
  rotationY: 0.45,
  rotationX: -0.12,
  scale: 1,
  tilt: THREE.MathUtils.degToRad(26.7),
};

const LIMITS = {
  rotationX: [-0.8, 0.8],
  scale: [0.68, 1.7],
  tilt: [THREE.MathUtils.degToRad(-18), THREE.MathUtils.degToRad(72)],
};

const state = {
  targetRotationY: DEFAULT_VIEW.rotationY,
  targetRotationX: DEFAULT_VIEW.rotationX,
  targetScale: DEFAULT_VIEW.scale,
  targetTilt: DEFAULT_VIEW.tilt,
  detected: false,
  mirroredCamera: true,
  mode: "待机",
  preset: "natural",
};

const renderer = new THREE.WebGLRenderer({
  canvas: sceneCanvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0.12, 7);

const root = new THREE.Group();
scene.add(root);

const keyLight = new THREE.DirectionalLight(0xffe0ad, 3.2);
keyLight.position.set(-3.5, 2.8, 4.5);
scene.add(keyLight);
scene.add(new THREE.HemisphereLight(0x94ccff, 0x231a16, 1.25));

const saturnTexture = createSaturnTexture();
const saturn = new THREE.Mesh(
  new THREE.SphereGeometry(1.22, 96, 64),
  new THREE.MeshStandardMaterial({
    map: saturnTexture,
    roughness: 0.82,
    metalness: 0.02,
  }),
);
root.add(saturn);

const ringTexture = createRingTexture();
const rings = new THREE.Mesh(
  new THREE.RingGeometry(1.55, 2.68, 192, 8),
  new THREE.MeshStandardMaterial({
    map: ringTexture,
    alphaMap: ringTexture,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.72,
    metalness: 0.08,
  }),
);
rings.rotation.x = Math.PI / 2;
root.add(rings);

const ringShadowTexture = createRingShadowTexture();
const ringShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(5.7, 5.7),
  new THREE.MeshBasicMaterial({
    map: ringShadowTexture,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
ringShadow.rotation.x = Math.PI / 2;
ringShadow.position.y = 0.012;
root.add(ringShadow);

const stars = createStars();
scene.add(stars);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  gestureCanvas.width = Math.floor(width * window.devicePixelRatio);
  gestureCanvas.height = Math.floor(height * window.devicePixelRatio);
  gestureCanvas.style.width = `${width}px`;
  gestureCanvas.style.height = `${height}px`;
  gestureContext.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function setPreset(preset) {
  state.preset = preset;
  presetButtons.forEach((button) => {
    const isActive = button.dataset.preset === preset;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (preset === "infrared") {
    saturn.material.color.set(0xff8a4c);
    rings.material.color.set(0x7bd8ff);
    keyLight.color.set(0xff6d4c);
    keyLight.intensity = 3.8;
  } else if (preset === "eclipse") {
    saturn.material.color.set(0x6d7485);
    rings.material.color.set(0xead9b6);
    keyLight.color.set(0x86aaff);
    keyLight.intensity = 1.85;
  } else {
    saturn.material.color.set(0xffffff);
    rings.material.color.set(0xffffff);
    keyLight.color.set(0xffe0ad);
    keyLight.intensity = 3.2;
  }
}

function updateHud() {
  modeLabel.textContent = state.mode;
  scaleLabel.textContent = `${state.targetScale.toFixed(2)}x`;
  tiltLabel.textContent = `${THREE.MathUtils.radToDeg(state.targetTilt).toFixed(1)}°`;
  trackingDot.classList.toggle("active", state.detected);
}

function resetView() {
  state.targetRotationY = DEFAULT_VIEW.rotationY;
  state.targetRotationX = DEFAULT_VIEW.rotationX;
  state.targetScale = DEFAULT_VIEW.scale;
  state.targetTilt = DEFAULT_VIEW.tilt;
  state.mode = cameraSession.stream ? "手势待机" : "触控备用";
  updateHud();
}

function setGestureTarget(key, value, smoothing = 0.28) {
  if (key === "targetRotationX") {
    value = THREE.MathUtils.clamp(value, ...LIMITS.rotationX);
  } else if (key === "targetScale") {
    value = THREE.MathUtils.clamp(value, ...LIMITS.scale);
  } else if (key === "targetTilt") {
    value = THREE.MathUtils.clamp(value, ...LIMITS.tilt);
  }

  state[key] = THREE.MathUtils.lerp(state[key], value, smoothing);
}

async function startCamera() {
  if (cameraSession.starting) return;
  if (cameraSession.stream) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    trackingLabel.textContent = "浏览器不支持摄像头";
    state.mode = "摄像头不可用";
    updateHud();
    return;
  }

  if (!window.isSecureContext) {
    trackingLabel.textContent = "需要 HTTPS 或 localhost";
    state.mode = "权限受限";
    updateHud();
    return;
  }

  try {
    cameraSession.starting = true;
    cameraButton.disabled = true;
    cameraButtonLabel.textContent = "启动中";
    trackingLabel.textContent = "请求摄像头";
    const stream = await requestCameraStream();
    cameraSession.stream = stream;
    bindCameraTrackEvents(stream);
    video.srcObject = stream;
    setCameraMirror(stream);
    await video.play();
    stage.classList.add("camera-on");
    trackingLabel.textContent = "加载手势模型";
    await startHandTracking();
    setCameraButtonState(true);
  } catch (error) {
    console.error(error);
    stopCamera();
    trackingLabel.textContent = getCameraErrorMessage(error);
    cameraButtonLabel.textContent = "重试";
    state.mode = "触控备用";
  } finally {
    cameraSession.starting = false;
    cameraButton.disabled = false;
    updateHud();
  }
}

function stopCamera() {
  stopHandDetection();

  cameraSession.handLandmarker?.close?.();
  cameraSession.handLandmarker = null;
  cameraSession.lastVideoTime = -1;
  cameraSession.shouldResumeOnVisible = false;
  cameraSession.stream?.getTracks().forEach((track) => track.stop());
  cameraSession.stream = null;

  video.pause();
  video.srcObject = null;
  stage.classList.remove("camera-on");
  video.classList.remove("mirrored");
  state.detected = false;
  state.mirroredCamera = true;
  state.mode = "触控备用";
  trackingLabel.textContent = "摄像头已关闭";
  clearGestures();
  setCameraButtonState(false);
  updateHud();
}

function setCameraButtonState(isOn) {
  cameraButtonLabel.textContent = isOn ? "关闭 AR" : "开启 AR";
  cameraButton.setAttribute("aria-label", isOn ? "关闭 AR 摄像头" : "开启 AR 摄像头");
  cameraButton.setAttribute("aria-pressed", String(isOn));
}

async function requestCameraStream() {
  const constraints = [
    {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastError;
  for (const constraint of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function bindCameraTrackEvents(stream) {
  stream.getVideoTracks().forEach((track) => {
    track.addEventListener(
      "ended",
      () => {
        if (cameraSession.stream !== stream) return;
        stopCamera();
        trackingLabel.textContent = "摄像头已断开";
        state.mode = "触控备用";
        updateHud();
      },
      { once: true },
    );
  });
}

function setCameraMirror(stream) {
  const [track] = stream.getVideoTracks();
  const settings = track?.getSettings?.() ?? {};
  state.mirroredCamera = settings.facingMode !== "environment";
  video.classList.toggle("mirrored", state.mirroredCamera);
}

function getCameraErrorMessage(error) {
  if (error?.name === "MediaPipeLoadError") return "手势模型加载失败";
  if (error?.name === "NotAllowedError") return "摄像头权限被拒绝";
  if (error?.name === "NotFoundError") return "未找到摄像头";
  if (error?.name === "NotReadableError") return "摄像头被占用";
  if (error?.name === "OverconstrainedError") return "摄像头参数不支持";
  if (error?.name === "SecurityError") return "页面无摄像头权限";
  return "摄像头启动失败";
}

async function startHandTracking() {
  if (cameraSession.handLandmarker) return;

  try {
    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
    );
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    const handLandmarker = await createHandLandmarker(vision, filesetResolver);
    cameraSession.handLandmarker = handLandmarker;
    cameraSession.lastVideoTime = -1;
    startHandDetection();
  } catch (error) {
    error.name = "MediaPipeLoadError";
    throw error;
  }
}

function startHandDetection() {
  if (cameraSession.detectAnimationId || !cameraSession.stream || !cameraSession.handLandmarker) return;
  if (document.hidden) {
    cameraSession.shouldResumeOnVisible = true;
    return;
  }

  const detect = () => {
    if (!cameraSession.stream || !cameraSession.handLandmarker || document.hidden) {
      cameraSession.detectAnimationId = 0;
      cameraSession.shouldResumeOnVisible = Boolean(cameraSession.stream && cameraSession.handLandmarker);
      return;
    }

    if (video.currentTime !== cameraSession.lastVideoTime) {
      cameraSession.lastVideoTime = video.currentTime;
      const result = cameraSession.handLandmarker.detectForVideo(video, performance.now());
      applyGestureResult(result.landmarks ?? []);
    }
    cameraSession.detectAnimationId = requestAnimationFrame(detect);
  };
  cameraSession.detectAnimationId = requestAnimationFrame(detect);
}

function stopHandDetection() {
  if (!cameraSession.detectAnimationId) return;
  cancelAnimationFrame(cameraSession.detectAnimationId);
  cameraSession.detectAnimationId = 0;
}

async function createHandLandmarker(vision, filesetResolver) {
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

function applyGestureResult(hands) {
  clearGestures();
  state.detected = hands.length > 0;
  trackingLabel.textContent = hands.length ? `${hands.length} 只手已追踪` : "寻找手势";

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

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clearGestures() {
  gestureContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
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

function animate() {
  requestAnimationFrame(animate);

  saturn.rotation.y += 0.004;
  stars.rotation.y += 0.0008;

  root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, state.targetRotationY, 0.075);
  root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, state.targetRotationX, 0.075);
  root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, state.targetTilt, 0.075);
  const scale = THREE.MathUtils.lerp(root.scale.x, state.targetScale, 0.09);
  root.scale.setScalar(scale);

  renderer.render(scene, camera);
}

function bindPointerFallback() {
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
      ...LIMITS.rotationX,
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
        ...LIMITS.scale,
      );
      state.mode = "滚轮缩放";
      updateHud();
    },
    { passive: true },
  );
}

function handleVisibilityChange() {
  if (document.hidden) {
    cameraSession.shouldResumeOnVisible = Boolean(cameraSession.stream && cameraSession.handLandmarker);
    stopHandDetection();
    return;
  }

  if (cameraSession.shouldResumeOnVisible) {
    cameraSession.shouldResumeOnVisible = false;
    cameraSession.lastVideoTime = -1;
    startHandDetection();
  }
}

window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", handleVisibilityChange);
cameraButton.addEventListener("click", startCamera);
resetButton.addEventListener("click", resetView);
presetButtons.forEach((button) => {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
});

resize();
bindPointerFallback();
updateHud();
animate();
