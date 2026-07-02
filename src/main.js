import * as THREE from "three";

const video = document.querySelector("#cameraFeed");
const stage = document.querySelector(".stage");
const cameraButton = document.querySelector("#cameraButton");
const cameraButtonLabel = document.querySelector("#cameraButtonLabel");
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

const state = {
  targetRotationY: 0.45,
  targetRotationX: -0.12,
  targetScale: 1,
  targetTilt: THREE.MathUtils.degToRad(26.7),
  detected: false,
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

const shadow = new THREE.Mesh(
  new THREE.RingGeometry(1.18, 2.72, 192),
  new THREE.MeshBasicMaterial({
    color: 0x050507,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  }),
);
shadow.rotation.x = Math.PI / 2;
shadow.position.z = -0.015;
root.add(shadow);

const stars = createStars();
scene.add(stars);

function createSaturnTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const bands = [
    "#c99f63",
    "#e0c08a",
    "#b7834e",
    "#efd6a1",
    "#9e7048",
    "#d8b177",
    "#f2d9a7",
    "#b98955",
  ];

  for (let y = 0; y < canvas.height; y += 1) {
    const band = bands[Math.floor((y / canvas.height) * bands.length)];
    ctx.fillStyle = band;
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 220; i += 1) {
    const y = Math.random() * canvas.height;
    const h = 1 + Math.random() * 5;
    ctx.fillStyle = i % 2 ? "#fff1c7" : "#6d4c35";
    ctx.fillRect(0, y, canvas.width, h);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.08, "rgba(214,190,145,0.18)");
  gradient.addColorStop(0.24, "rgba(245,222,170,0.85)");
  gradient.addColorStop(0.42, "rgba(124,98,72,0.28)");
  gradient.addColorStop(0.48, "rgba(10,8,7,0.08)");
  gradient.addColorStop(0.54, "rgba(239,210,155,0.92)");
  gradient.addColorStop(0.76, "rgba(188,160,113,0.64)");
  gradient.addColorStop(0.95, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < canvas.width; x += 4) {
    ctx.fillStyle = `rgba(255, 244, 211, ${Math.random() * 0.16})`;
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 900; i += 1) {
    positions.push(
      THREE.MathUtils.randFloatSpread(28),
      THREE.MathUtils.randFloatSpread(16),
      THREE.MathUtils.randFloat(-18, -6),
    );
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xddeeff,
      size: 0.022,
      transparent: true,
      opacity: 0.74,
    }),
  );
}

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
    button.classList.toggle("active", button.dataset.preset === preset);
  });

  if (preset === "infrared") {
    saturn.material.color.set(0xff8a4c);
    rings.material.color.set(0x7bd8ff);
    keyLight.color.set(0xff6d4c);
  } else if (preset === "eclipse") {
    saturn.material.color.set(0x8c96aa);
    rings.material.color.set(0xd9c7a2);
    keyLight.color.set(0x86aaff);
  } else {
    saturn.material.color.set(0xffffff);
    rings.material.color.set(0xffffff);
    keyLight.color.set(0xffe0ad);
  }
}

function updateHud() {
  modeLabel.textContent = state.mode;
  scaleLabel.textContent = `${state.targetScale.toFixed(2)}x`;
  tiltLabel.textContent = `${THREE.MathUtils.radToDeg(state.targetTilt).toFixed(1)}°`;
  trackingDot.classList.toggle("active", state.detected);
}

async function startCamera() {
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
    cameraButton.disabled = true;
    cameraButtonLabel.textContent = "启动中";
    trackingLabel.textContent = "请求摄像头";
    const stream = await requestCameraStream();
    video.srcObject = stream;
    await video.play();
    stage.classList.add("camera-on");
    trackingLabel.textContent = "加载手势模型";
    await startHandTracking();
    cameraButtonLabel.textContent = "已开启";
  } catch (error) {
    console.error(error);
    trackingLabel.textContent = getCameraErrorMessage(error);
    cameraButtonLabel.textContent = "重试";
    state.mode = "触控备用";
  } finally {
    cameraButton.disabled = false;
    updateHud();
  }
}

async function requestCameraStream() {
  const constraints = [
    {
      video: {
        facingMode: { ideal: "environment" },
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

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") return "摄像头权限被拒绝";
  if (error?.name === "NotFoundError") return "未找到摄像头";
  if (error?.name === "NotReadableError") return "摄像头被占用";
  if (error?.name === "OverconstrainedError") return "摄像头参数不支持";
  if (error?.name === "SecurityError") return "页面无摄像头权限";
  return "摄像头启动失败";
}

async function startHandTracking() {
  const vision = await import(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
  );
  const filesetResolver = await vision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  );
  const handLandmarker = await createHandLandmarker(vision, filesetResolver);

  let lastVideoTime = -1;
  const detect = () => {
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = handLandmarker.detectForVideo(video, performance.now());
      applyGestureResult(result.landmarks ?? []);
    }
    requestAnimationFrame(detect);
  };
  detect();
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
  state.targetRotationY = THREE.MathUtils.mapLinear(palm.x, 0.18, 0.82, 1.15, -1.15);
  state.targetRotationX = THREE.MathUtils.mapLinear(palm.y, 0.18, 0.82, -0.42, 0.42);

  const pinch = distance(primary[4], primary[8]);
  if (pinch < 0.075) {
    state.targetScale = THREE.MathUtils.clamp(1.55 - pinch * 7.5, 0.72, 1.48);
    state.mode = "捏合缩放";
  } else {
    state.mode = "手掌旋转";
  }

  if (hands.length > 1) {
    const a = midpoint(hands[0][0], hands[0][9]);
    const b = midpoint(hands[1][0], hands[1][9]);
    const heightDelta = THREE.MathUtils.clamp((a.y - b.y) * 1.9, -0.78, 0.78);
    state.targetTilt = THREE.MathUtils.degToRad(26.7) + heightDelta;
    state.targetScale = THREE.MathUtils.clamp(0.82 + distance(a, b) * 1.35, 0.72, 1.62);
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
      const x = (1 - points[index].x) * width;
      const y = points[index].y * height;
      if (i === 0) gestureContext.moveTo(x, y);
      else gestureContext.lineTo(x, y);
    });
    gestureContext.stroke();
  });

  points.forEach((point, index) => {
    const radius = index === 4 || index === 8 ? 5 : 3;
    gestureContext.beginPath();
    gestureContext.arc((1 - point.x) * width, point.y * height, radius, 0, Math.PI * 2);
    gestureContext.fill();
  });
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
    state.targetRotationX = THREE.MathUtils.clamp(state.targetRotationX + dy * 0.006, -0.8, 0.8);
    state.mode = "触控旋转";
    updateHud();
  });

  sceneCanvas.addEventListener("pointerup", (event) => {
    pointer.active = false;
    sceneCanvas.releasePointerCapture(event.pointerId);
  });

  window.addEventListener(
    "wheel",
    (event) => {
      state.targetScale = THREE.MathUtils.clamp(state.targetScale - event.deltaY * 0.001, 0.68, 1.7);
      state.mode = "滚轮缩放";
      updateHud();
    },
    { passive: true },
  );
}

window.addEventListener("resize", resize);
cameraButton.addEventListener("click", startCamera);
presetButtons.forEach((button) => {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
});

resize();
bindPointerFallback();
updateHud();
animate();
