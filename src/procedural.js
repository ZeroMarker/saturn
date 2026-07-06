import * as THREE from "three";

export function createSaturnTexture() {
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
  const random = createSeededRandom(1209);

  for (let y = 0; y < canvas.height; y += 1) {
    const band = bands[Math.floor((y / canvas.height) * bands.length)];
    ctx.fillStyle = band;
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 220; i += 1) {
    const y = random() * canvas.height;
    const h = 1 + random() * 5;
    ctx.fillStyle = i % 2 ? "#fff1c7" : "#6d4c35";
    ctx.fillRect(0, y, canvas.width, h);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.08, "rgba(214,190,145,0.18)");
  gradient.addColorStop(0.21, "rgba(245,222,170,0.88)");
  gradient.addColorStop(0.29, "rgba(90,73,58,0.22)");
  gradient.addColorStop(0.42, "rgba(124,98,72,0.28)");
  gradient.addColorStop(0.48, "rgba(7,6,6,0.02)");
  gradient.addColorStop(0.5, "rgba(2,2,3,0.72)");
  gradient.addColorStop(0.52, "rgba(7,6,6,0.02)");
  gradient.addColorStop(0.58, "rgba(239,210,155,0.92)");
  gradient.addColorStop(0.76, "rgba(188,160,113,0.64)");
  gradient.addColorStop(0.95, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const random = createSeededRandom(1206);
  for (let x = 0; x < canvas.width; x += 4) {
    ctx.fillStyle = `rgba(255, 244, 211, ${random() * 0.16})`;
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRingShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-0.34);
  ctx.scale(1, 0.38);

  const shadow = ctx.createRadialGradient(0, 0, 72, 0, 0, 430);
  shadow.addColorStop(0, "rgba(0,0,0,0.58)");
  shadow.addColorStop(0.42, "rgba(0,0,0,0.44)");
  shadow.addColorStop(0.78, "rgba(0,0,0,0.16)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(118, 0, 430, 156, 0, -0.34, 0.86);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStars() {
  const group = new THREE.Group();
  const layers = [
    { count: 420, spreadX: 30, spreadY: 17, zMin: -12, zMax: -6, size: 0.018, opacity: 0.48 },
    { count: 360, spreadX: 38, spreadY: 21, zMin: -22, zMax: -12, size: 0.026, opacity: 0.66 },
    { count: 180, spreadX: 48, spreadY: 26, zMin: -34, zMax: -22, size: 0.038, opacity: 0.86 },
  ];

  layers.forEach((layer, layerIndex) => {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const random = createSeededRandom(2600 + layerIndex * 97);

    for (let i = 0; i < layer.count; i += 1) {
      positions.push(
        (random() - 0.5) * layer.spreadX,
        (random() - 0.5) * layer.spreadY,
        layer.zMin + random() * (layer.zMax - layer.zMin),
      );
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    group.add(
      new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: layerIndex === 0 ? 0x95d7ff : 0xf1f7ff,
          size: layer.size,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
        }),
      ),
    );
  });

  return group;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
