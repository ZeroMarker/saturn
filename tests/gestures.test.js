import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import { configureGestures, applyGestureResult } from "../src/gestures.js";
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
