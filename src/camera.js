import { state } from "./state.js";

const cameraSession = {
  stream: null,
  detectAnimationId: 0,
  lastVideoTime: -1,
  starting: false,
  shouldResumeOnVisible: false,
};

let videoElement = null;
let onStreamReady = null;
let onStreamEnd = null;
let updateTrackingLabel = null;
let setCameraButtonState = null;
let updateMode = null;
let updateHud = null;

let handDetectFn = null;

export function configureCamera(config) {
  videoElement = config.video;
  onStreamReady = config.onStreamReady ?? (() => {});
  onStreamEnd = config.onStreamEnd ?? (() => {});
  updateTrackingLabel = config.updateTrackingLabel ?? (() => {});
  setCameraButtonState = config.setCameraButtonState ?? (() => {});
  updateMode = config.updateMode ?? (() => {});
  updateHud = config.updateHud ?? (() => {});
}

export function isCameraOn() {
  return Boolean(cameraSession.stream);
}

/** Injected by main.js — called once per animation frame when camera is active */
export function setHandDetectFunction(fn) {
  handDetectFn = fn;
}

export async function startCamera() {
  if (cameraSession.starting) return;
  if (cameraSession.stream) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    updateTrackingLabel("浏览器不支持摄像头");
    updateMode("摄像头不可用");
    updateHud();
    return;
  }

  if (!window.isSecureContext) {
    updateTrackingLabel("需要 HTTPS 或 localhost");
    updateMode("权限受限");
    updateHud();
    return;
  }

  try {
    cameraSession.starting = true;
    setCameraButtonState("starting");
    updateTrackingLabel("请求摄像头");
    const stream = await requestCameraStream();
    cameraSession.stream = stream;
    bindCameraTrackEvents(stream);
    videoElement.srcObject = stream;
    setCameraMirror(stream);
    await videoElement.play();
    document.querySelector(".stage").classList.add("camera-on");
    updateTrackingLabel("加载手势模型");
    await onStreamReady();
    setCameraButtonState(true);
    startHandDetection();
  } catch (error) {
    stopCamera();
    updateTrackingLabel(getCameraErrorMessage(error));
    setCameraButtonState(false);
    console.warn("Camera startup failed:", error.name, error.message);
  } finally {
    cameraSession.starting = false;
    updateHud();
  }
}

export function stopCamera() {
  stopHandDetection();
  cameraSession.lastVideoTime = -1;
  cameraSession.shouldResumeOnVisible = false;

  if (cameraSession.stream) {
    cameraSession.stream.getTracks().forEach((track) => track.stop());
    cameraSession.stream = null;
  }

  stopCameraInternal();
  onStreamEnd();
  updateHud();
}

function stopCameraInternal() {
  videoElement.pause();
  videoElement.srcObject = null;
  document.querySelector(".stage").classList.remove("camera-on");
  videoElement.classList.remove("mirrored");
  state.detected = false;
  state.mirroredCamera = true;
  updateMode("触控备用");
  updateTrackingLabel("摄像头已关闭");
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
        updateTrackingLabel("摄像头已断开");
        updateMode("触控备用");
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
  videoElement.classList.toggle("mirrored", state.mirroredCamera);
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

// ─── Frame-by-frame detection loop ────────────────────────────

function startHandDetection() {
  if (cameraSession.detectAnimationId || !cameraSession.stream || !handDetectFn) return;
  if (document.hidden) {
    cameraSession.shouldResumeOnVisible = true;
    return;
  }

  const detect = () => {
    if (!cameraSession.stream || document.hidden) {
      cameraSession.detectAnimationId = 0;
      cameraSession.shouldResumeOnVisible = Boolean(cameraSession.stream);
      return;
    }

    if (videoElement.currentTime !== cameraSession.lastVideoTime) {
      cameraSession.lastVideoTime = videoElement.currentTime;
      handDetectFn(videoElement, performance.now());
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

export function handleVisibilityChange() {
  if (document.hidden) {
    cameraSession.shouldResumeOnVisible = Boolean(cameraSession.stream);
    stopHandDetection();
    return;
  }

  if (cameraSession.shouldResumeOnVisible) {
    cameraSession.shouldResumeOnVisible = false;
    cameraSession.lastVideoTime = -1;
    if (cameraSession.stream) {
      startHandDetection();
    }
  }
}
