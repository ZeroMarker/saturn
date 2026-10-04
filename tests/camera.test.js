import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  configureCamera, startCamera, stopCamera, isCameraOn,
  setHandDetectFunction, handleVisibilityChange,
} from "../src/camera.js";

let frames, video, labels, buttons, stream, requests, hidden, ready;
let originalDescriptors;

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function createStream() {
  const track = new EventTarget();
  track.stopped = false;
  track.stop = () => { track.stopped = true; };
  track.getSettings = () => ({ facingMode: "user" });
  return { getTracks: () => [track], getVideoTracks: () => [track], track };
}

beforeEach(() => {
  originalDescriptors = new Map();
  frames = new Map();
  video = {
    srcObject: null, currentTime: 1, readyState: 2,
    play: async () => {}, pause: () => {},
    classList: { toggle() {}, remove() {} },
  };
  labels = [];
  buttons = [];
  stream = createStream();
  requests = 0;
  hidden = false;
  ready = true;
  let frameId = 0;
  const mocks = {
    window: { isSecureContext: true },
    document: {
      get hidden() { return hidden; },
      querySelector: () => ({ classList: { add() {}, remove() {} } }),
    },
    navigator: { mediaDevices: { getUserMedia: async () => { requests++; return stream; } } },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  for (const [key, value] of Object.entries(mocks)) {
    originalDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  configureCamera({
    video, updateTrackingLabel: (text) => labels.push(text),
    setCameraButtonState: (value) => buttons.push(value),
    hasHandLandmarker: () => ready,
  });
  setHandDetectFunction(() => {});
});

afterEach(() => {
  stopCamera();
  for (const [key, descriptor] of originalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

function nextFrame() {
  const [id, callback] = frames.entries().next().value;
  frames.delete(id);
  callback();
}

test("permission denial requests once and leaves a usable retry button", async (t) => {
  t.mock.method(console, "warn", () => {});
  navigator.mediaDevices.getUserMedia = async () => {
    requests++;
    throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
  };
  await startCamera();
  assert.equal(requests, 1);
  assert.equal(isCameraOn(), false);
  assert.equal(labels.at(-1), "摄像头权限被拒绝");
  assert.equal(buttons.at(-1), "retry");
  navigator.mediaDevices.getUserMedia = async () => stream;
  await startCamera();
  assert.equal(isCameraOn(), true);
});

test("unsupported constraints fall back to the next camera request", async () => {
  navigator.mediaDevices.getUserMedia = async () => {
    if (++requests === 1) throw Object.assign(new Error(), { name: "OverconstrainedError" });
    return stream;
  };
  await startCamera();
  assert.equal(requests, 2);
  assert.equal(isCameraOn(), true);
});

test("stopping during permission request releases a late stream", async () => {
  const pending = deferred();
  navigator.mediaDevices.getUserMedia = () => pending.promise;
  const startup = startCamera();
  stopCamera();
  pending.resolve(stream);
  await startup;
  assert.equal(stream.track.stopped, true);
  assert.equal(video.srcObject, null);
  assert.equal(isCameraOn(), false);
  assert.equal(buttons.at(-1), false);
  assert.equal(frames.size, 0);
});

test("cancelled startup does not request fallback constraints", async () => {
  const pending = deferred();
  navigator.mediaDevices.getUserMedia = () => { requests++; return pending.promise; };
  const startup = startCamera();
  stopCamera();
  pending.reject(Object.assign(new Error("constraints"), { name: "OverconstrainedError" }));
  await startup;
  assert.equal(requests, 1);
  assert.equal(isCameraOn(), false);
  assert.equal(buttons.at(-1), false);
  assert.equal(frames.size, 0);
});

test("cancelled startup does not retry constraints or disturb a newer session", async () => {
  const pending = deferred();
  navigator.mediaDevices.getUserMedia = () => { requests++; return pending.promise; };
  const oldStartup = startCamera();
  stopCamera();
  navigator.mediaDevices.getUserMedia = async () => { requests++; return stream; };
  await startCamera();
  pending.reject(Object.assign(new Error("constraints"), { name: "OverconstrainedError" }));
  await oldStartup;
  assert.equal(requests, 2);
  assert.equal(video.srcObject, stream);
  assert.equal(stream.track.stopped, false);
  assert.equal(buttons.at(-1), true);
});

test("track interruption during model loading cannot restart detection", async () => {
  const pending = deferred();
  const entered = deferred();
  configureCamera({
    video, onStreamReady: () => { entered.resolve(); return pending.promise; },
    setCameraButtonState: (value) => buttons.push(value), hasHandLandmarker: () => ready,
  });
  const startup = startCamera();
  await entered.promise;
  stream.track.dispatchEvent(new Event("ended"));
  pending.resolve();
  await startup;
  assert.equal(isCameraOn(), false);
  assert.equal(buttons.at(-1), false);
  assert.equal(frames.size, 0);
});

test("late completion from an old startup does not replace the new session", async () => {
  const pending = deferred();
  const oldStream = stream;
  navigator.mediaDevices.getUserMedia = () => pending.promise;
  const oldStartup = startCamera();
  stopCamera();
  const newStream = createStream();
  navigator.mediaDevices.getUserMedia = async () => newStream;
  await startCamera();
  pending.resolve(oldStream);
  await oldStartup;
  assert.equal(video.srcObject, newStream);
  assert.equal(oldStream.track.stopped, true);
  assert.equal(newStream.track.stopped, false);
  assert.equal(buttons.at(-1), true);
});

test("detection skips duplicate and unready frames and pauses in the background", async () => {
  let detections = 0;
  setHandDetectFunction(() => detections++);
  await startCamera();
  nextFrame();
  nextFrame();
  assert.equal(detections, 1);
  video.currentTime = 2;
  video.readyState = 1;
  nextFrame();
  assert.equal(detections, 1);
  video.readyState = 2;
  nextFrame();
  assert.equal(detections, 2);
  hidden = true;
  handleVisibilityChange();
  assert.equal(frames.size, 0);
  hidden = false;
  handleVisibilityChange();
  nextFrame();
  assert.equal(detections, 3);
});

test("detection failure stops the stream and enables retry", async (t) => {
  t.mock.method(console, "warn", () => {});
  setHandDetectFunction(() => { throw new Error("inference failed"); });
  await startCamera();
  nextFrame();
  assert.equal(isCameraOn(), false);
  assert.equal(stream.track.stopped, true);
  assert.equal(buttons.at(-1), "retry");
  assert.equal(labels.at(-1), "手势识别失败，请重试");
  assert.equal(frames.size, 0);
});
