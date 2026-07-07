import * as THREE from "three";
import {
  createSaturnTexture,
  createRingTexture,
  createRingShadowTexture,
  createStars,
} from "./procedural.js";
import { state } from "./state.js";

let renderer, scene, camera, root, saturn, rings, ringShadow, stars, keyLight;
let animationId = null;

export function initScene(canvas) {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.12, 7);

  root = new THREE.Group();
  scene.add(root);

  keyLight = new THREE.DirectionalLight(0xffe0ad, 3.2);
  keyLight.position.set(-3.5, 2.8, 4.5);
  scene.add(keyLight);
  scene.add(new THREE.HemisphereLight(0x94ccff, 0x231a16, 1.25));

  const saturnTexture = createSaturnTexture();
  saturn = new THREE.Mesh(
    new THREE.SphereGeometry(1.22, 96, 64),
    new THREE.MeshStandardMaterial({
      map: saturnTexture,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );
  root.add(saturn);

  const ringTexture = createRingTexture();
  rings = new THREE.Mesh(
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
  ringShadow = new THREE.Mesh(
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

  stars = createStars();
  scene.add(stars);

  return { renderer, scene, camera, root, saturn, rings, keyLight, stars };
}

export function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function setPreset(preset) {

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

export function startAnimation() {
  if (animationId) return;
  let lastTime = performance.now();

  function animate(time) {
    animationId = requestAnimationFrame(animate);

    // Normalize to ~60 fps frame time, cap to avoid spiral-of-death
    const delta = Math.min((time - lastTime) / 16.667, 4);
    lastTime = time;

    saturn.rotation.y += 0.004 * delta;
    stars.rotation.y += 0.0008 * delta;

    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, state.targetRotationY, 0.075);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, state.targetRotationX, 0.075);
    root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, state.targetTilt, 0.075);
    const scale = THREE.MathUtils.lerp(root.scale.x, state.targetScale, 0.09);
    root.scale.setScalar(scale);

    renderer.render(scene, camera);
  }

  animationId = requestAnimationFrame(animate);
}

export function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}
