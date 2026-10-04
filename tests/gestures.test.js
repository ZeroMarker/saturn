import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import { configureGestures, applyGestureResult, closeHandLandmarker } from "../src/gestures.js";
import { state, DEFAULT_VIEW } from "../src/state.js";
import { projectVideoPoint } from "../src/video-layout.js";

let arcs, originalWindow;
function resetView(mirrored = true) {
  Object.assign(state, {
    targetRotationY: DEFAULT_VIEW.rotationY, targetRotationX: DEFAULT_VIEW.rotationX,
    targetScale: DEFAULT_VIEW.scale, targetTilt: DEFAULT_VIEW.tilt,
    mirroredCamera: mirrored, detected: false,
  });
}

beforeEach(() => {
  originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { innerWidth: 400, innerHeight: 800 } });
  arcs = [];
  configureGestures({
    video: { videoWidth: 1280, videoHeight: 720 },
    gestureContext: {
      clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
      arc: (x, y) => arcs.push({ x, y }),
    },
  });
  resetView();
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
});

function hand(x, y) {
  const points = Array.from({ length: 21 }, () => ({ x, y }));
  points[4] = { x: x - 0.03, y };
  points[8] = { x: x + 0.03, y };
  return points;
}

function pinchedHand(pinch) {
  const points = hand(0.5, 0.5);
  points[4].x = 0.5 - pinch / 2;
  points[8].x = 0.5 + pinch / 2;
  return points;
}

test("rotation uses visible screen coordinates in portrait and landscape, with either mirror", () => {
  for (const [width, height] of [[400, 800], [1600, 400]]) {
    window.innerWidth = width;
    window.innerHeight = height;
    const scale = Math.max(width / 1280, height / 720);
    for (const mirrored of [false, true]) {
      for (const [screenX, screenY] of [[0.18, 0.18], [0.82, 0.82]]) {
        const x = ((mirrored ? 1 - screenX : screenX) * width - (width - 1280 * scale) / 2) / (1280 * scale);
        const y = (screenY * height - (height - 720 * scale) / 2) / (720 * scale);
        resetView(mirrored);
        state.targetRotationY = state.targetRotationX = 0;
        applyGestureResult([hand(x, y)]);
        assert.ok(Math.abs(state.targetRotationY / 0.28 - (screenX === 0.18 ? 1.15 : -1.15)) < 1e-9);
        assert.ok(Math.abs(state.targetRotationX / 0.28 - (screenY === 0.18 ? -0.42 : 0.42)) < 1e-9);
      }
    }
  }
});

test("pinch preserves initial scale, zooms both ways and continues beyond activation threshold", () => {
  state.targetScale = 0.8;
  applyGestureResult([pinchedHand(0.06)]);
  assert.ok(Math.abs(state.targetScale - 0.8) < 1e-9);
  for (let i = 0; i < 80; i++) applyGestureResult([pinchedHand(0.12)]);
  assert.equal(state.mode, "捏合缩放");
  assert.ok(Math.abs(state.targetScale - 1.6) < 1e-9);
  for (let i = 0; i < 80; i++) applyGestureResult([pinchedHand(0.03)]);
  assert.ok(Math.abs(state.targetScale - 0.68) < 1e-9);
  for (let i = 0; i < 80; i++) applyGestureResult([pinchedHand(0.14)]);
  assert.ok(Math.abs(state.targetScale - 1.7) < 1e-9);
});

test("pinch releases and rebases after open fingers, tracking loss, two hands or camera stop", () => {
  const releases = [
    () => applyGestureResult([pinchedHand(0.16)]),
    () => applyGestureResult([]),
    () => applyGestureResult([hand(0.3, 0.5), hand(0.7, 0.5)]),
    () => closeHandLandmarker(),
  ];
  for (const release of releases) {
    applyGestureResult([pinchedHand(0.06)]);
    applyGestureResult([pinchedHand(0.1)]);
    release();
    state.targetScale = 1.2;
    applyGestureResult([pinchedHand(0.04)]);
    assert.ok(Math.abs(state.targetScale - 1.2) < 1e-9);
    applyGestureResult([]);
  }
});

test("overlapping pinch fingertips do not produce nonfinite zoom", () => {
  applyGestureResult([pinchedHand(0)]);
  assert.equal(state.targetScale, 1);
  for (let i = 0; i < 80; i++) applyGestureResult([pinchedHand(0.02)]);
  assert.ok(Math.abs(state.targetScale - 1.7) < 1e-9);
});

test("cover projection handles portrait crop, mirror and center", () => {
  const point = { x: 0.6, y: 0.25 };
  const normal = projectVideoPoint(point, 1280, 720, 400, 800, false);
  const mirrored = projectVideoPoint(point, 1280, 720, 400, 800, true);
  assert.ok(Math.abs(normal.x - 342.222222) < 0.000001);
  assert.equal(normal.y, 200);
  assert.ok(Math.abs(normal.x + mirrored.x - 400) < 0.000001);
  assert.deepEqual(projectVideoPoint({ x: 0.5, y: 0.5 }, 1280, 720, 400, 800, true), { x: 200, y: 400 });
});

test("cover projection handles wide windows and unknown video dimensions", () => {
  assert.deepEqual(projectVideoPoint({ x: 0.25, y: 0.25 }, 400, 800, 800, 400, false), { x: 200, y: -200 });
  assert.deepEqual(projectVideoPoint({ x: 0.25, y: 0.25 }, 0, 0, 800, 400, true), { x: 600, y: 100 });
});

test("drawn landmarks use the same cropped and mirrored coordinates as the video", () => {
  applyGestureResult([hand(0.6, 0.25)]);
  assert.ok(Math.abs(arcs[0].x - 57.777778) < 0.000001);
  assert.equal(arcs[0].y, 200);
});

test("two-hand controls are invariant to model result order, with either camera facing", () => {
  const a = hand(0.3, 0.25), b = hand(0.7, 0.6);
  const targets = () => [state.targetRotationY, state.targetRotationX, state.targetScale, state.targetTilt];
  for (const mirrored of [true, false]) {
    resetView(mirrored);
    applyGestureResult([a, b]);
    const expected = targets();
    resetView(mirrored);
    applyGestureResult([b, a]);
    assert.deepEqual(targets(), expected);
    assert.equal(state.mode, "双手操控");
  }
});

test("two-hand zoom is unaffected by either hand's pinch", () => {
  const a = hand(0.3, 0.25), b = hand(0.7, 0.6);
  applyGestureResult([a, b]);
  const expected = state.targetScale;
  a[4].x = 0;
  resetView();
  applyGestureResult([a, b]);
  assert.equal(state.targetScale, expected);
});
