import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import { bindPointerControls } from "../src/pointer.js";
import { state, DEFAULT_VIEW, LIMITS } from "../src/state.js";

let canvas, pointer, originalWindow, captures;

beforeEach(() => {
  originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  canvas = new EventTarget();
  canvas.clientHeight = 600;
  captures = new Set();
  canvas.setPointerCapture = (id) => captures.add(id);
  canvas.hasPointerCapture = (id) => captures.has(id);
  canvas.releasePointerCapture = (id) => captures.delete(id);
  Object.assign(state, { targetScale: 1, targetRotationY: DEFAULT_VIEW.rotationY, targetRotationX: DEFAULT_VIEW.rotationX });
  pointer = bindPointerControls(canvas, () => {});
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
});

function send(type, pointerId, clientX, clientY, button = 0) {
  canvas.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX, clientY, button }));
}

test("two-finger pinch scales without rotating and resumes one-finger drag without a jump", () => {
  send("pointerdown", 1, 100, 100);
  send("pointerdown", 2, 200, 100);
  send("pointermove", 2, 250, 100);
  assert.equal(state.targetScale, 1.5);
  assert.equal(state.targetRotationY, DEFAULT_VIEW.rotationY);
  assert.equal(state.mode, "触控缩放");
  send("pointerup", 1, 100, 100);
  send("pointermove", 2, 260, 100);
  assert.ok(Math.abs(state.targetRotationY - DEFAULT_VIEW.rotationY - 0.08) < 0.000001);
  assert.equal(state.targetScale, 1.5);
  send("pointerup", 2, 260, 100);
  assert.equal(pointer.active, false);
  assert.equal(captures.size, 0);
});

test("extra pointers and right-clicks do not corrupt the active drag", () => {
  send("pointerdown", 1, 100, 100, 2);
  assert.equal(pointer.active, false);
  send("pointerdown", 1, 100, 100);
  send("pointermove", 99, 900, 900);
  send("pointerup", 99, 900, 900);
  assert.equal(pointer.active, true);
  assert.equal(state.targetRotationY, DEFAULT_VIEW.rotationY);
  send("pointerdown", 2, 200, 100);
  send("pointerdown", 3, 300, 100);
  send("pointermove", 3, 900, 900);
  send("pointerup", 3, 900, 900);
  assert.equal(state.targetScale, 1);
  assert.equal(captures.size, 2);
});

test("pinch is bounded and handles initially overlapping fingers", () => {
  send("pointerdown", 1, 100, 100);
  send("pointerdown", 2, 100, 100);
  send("pointermove", 2, 110, 100);
  assert.equal(state.targetScale, 1);
  send("pointermove", 2, 1000, 100);
  assert.equal(state.targetScale, LIMITS.scale[1]);
  send("pointermove", 2, 101, 100);
  assert.equal(state.targetScale, LIMITS.scale[0]);
});

test("cancellation and window blur release captures and ignore subsequent moves", () => {
  send("pointerdown", 1, 100, 100);
  send("pointerdown", 2, 200, 100);
  send("pointercancel", 1, 100, 100);
  assert.equal(pointer.active, true);
  window.dispatchEvent(new Event("blur"));
  assert.equal(pointer.active, false);
  assert.equal(captures.size, 0);
  send("pointermove", 2, 900, 900);
  assert.equal(state.targetRotationY, DEFAULT_VIEW.rotationY);
});

test("wheel units are normalized and scrolling outside the canvas does not zoom", () => {
  const wheel = (target, deltaY, deltaMode) => {
    const event = Object.assign(new Event("wheel", { cancelable: true }), { deltaY, deltaMode });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  assert.equal(wheel(window, 100, 0), false);
  assert.equal(state.targetScale, 1);
  assert.equal(wheel(canvas, 5, 1), true);
  assert.equal(state.targetScale, 0.92);
  wheel(canvas, -100, 0);
  assert.equal(state.targetScale, 1.02);
  wheel(canvas, 1, 2);
  assert.equal(state.targetScale, LIMITS.scale[0]);
});
