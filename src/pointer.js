import { state, LIMITS } from "./state.js";

const clamp = (value, [min, max]) => Math.max(min, Math.min(max, value));

export function bindPointerControls(canvas, updateHud) {
  const points = new Map();
  const pointer = { active: false, x: 0, y: 0, lastX: 0, lastY: 0 };
  let pinchDistance = 0;
  let pinchScale = 1;

  function rebase() {
    pointer.active = points.size > 0;
    const [a, b] = points.values();
    if (a) {
      pointer.x = pointer.lastX = a.x;
      pointer.y = pointer.lastY = a.y;
    }
    pinchDistance = b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    pinchScale = state.targetScale;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || points.size >= 2) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    rebase();
  });

  canvas.addEventListener("pointermove", (event) => {
    const previous = points.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    points.set(event.pointerId, next);
    if (points.size === 2) {
      const [a, b] = points.values();
      if (pinchDistance > 0) {
        state.targetScale = clamp(pinchScale * Math.hypot(a.x - b.x, a.y - b.y) / pinchDistance, LIMITS.scale);
        state.mode = "触控缩放";
      } else {
        rebase();
      }
    } else {
      state.targetRotationY += (next.x - previous.x) * 0.008;
      state.targetRotationX = clamp(state.targetRotationX + (next.y - previous.y) * 0.006, LIMITS.rotationX);
      pointer.x = pointer.lastX = next.x;
      pointer.y = pointer.lastY = next.y;
      state.mode = "触控旋转";
    }
    updateHud();
  });

  const endPointer = (event) => {
    if (!points.delete(event.pointerId)) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    rebase();
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", endPointer);
  window.addEventListener("blur", () => {
    for (const pointerId of [...points.keys()]) endPointer({ pointerId });
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    state.targetScale = clamp(state.targetScale - event.deltaY * unit * 0.001, LIMITS.scale);
    state.mode = "滚轮缩放";
    // Keep a subsequent pinch relative to the new zoom level.
    rebase();
    updateHud();
  }, { passive: false });

  return pointer;
}
