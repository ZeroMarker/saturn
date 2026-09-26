import assert from "node:assert/strict";
import { test } from "node:test";
import { createSaturnRingGeometry } from "../src/procedural.js";

test("ring texture follows radius consistently around the circumference", () => {
  const geometry = createSaturnRingGeometry();
  try {
    const { uv, position } = geometry.attributes;
    const stride = geometry.parameters.thetaSegments + 1;
    for (let row = 0; row <= 8; row++) {
      for (let angle = 0; angle < stride; angle++) {
        const index = row * stride + angle;
        assert.ok(Math.abs(uv.getX(index) - row / 8) < 0.000001);
        assert.equal(uv.getY(index), 0.5);
        assert.ok(Math.abs(Math.hypot(position.getX(index), position.getY(index)) - (1.55 + 1.13 * row / 8)) < 0.000001);
      }
    }
  } finally {
    geometry.dispose();
  }
});
