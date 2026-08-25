/* ============================================================
   Roads-H in 3D (retro Rhodes "Piano Bass" style).
   Tolex-textured rounded hump lid, glossy black end blocks flanking
   the keys, brushed-aluminum ribbed control rail (2 knobs + jack,
   "Roads-H" script logo), red felt strip. Keys come from keys3d.js
   so they match the Synth-5 and Yamada exactly (same length, same
   hold/glissando animation).
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { buildKeyboard3D } from "./keys3d.js";
import { createStage } from "./stage3d.js";
import { pixelPlane, emberPaint } from "./pixel3d.js";

/**
 * Builds the rhodes into `host` and starts its render loop.
 * Call the returned stage's dispose() to release its WebGL context.
 */
export function buildRhodes(host) {
  const stage = createStage(host);
  const root = stage.root;

  /* ---------- textures ---------- */
  /* pebbled tolex vinyl: a bump-only speckle map (base color stays flat black) */
  function tolexBump() {
    const s = 512, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 3600; i++) {
      const px = Math.random() * s, py = Math.random() * s, r = 1.4 + Math.random() * 2.2;
      const shade = 96 + Math.floor(Math.random() * 96);
      x.fillStyle = `rgb(${shade},${shade},${shade})`;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); t.anisotropy = 8;
    return t;
  }
  /* brushed-aluminum ribbed rail: fine horizontal grooves */
  function ribTex() {
    const W = 512, H = 96, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#dfe2e8"); g.addColorStop(0.5, "#b9bcc4"); g.addColorStop(1, "#9a9da5");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let y = 2; y < H; y += 4) {
      x.strokeStyle = "rgba(255,255,255,0.35)"; x.lineWidth = 1;
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
      x.strokeStyle = "rgba(60,60,66,0.35)"; x.lineWidth = 1;
      x.beginPath(); x.moveTo(0, y + 1.5); x.lineTo(W, y + 1.5); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 8;
    return t;
  }
  function textTex(text, { w = 320, h = 72, font = "italic 700 34px Georgia, serif", color = "#e9e9f0", align = "center" } = {}) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.clearRect(0, 0, w, h);
    x.fillStyle = color; x.font = font; x.textBaseline = "middle"; x.textAlign = align;
    x.fillText(text, align === "left" ? 6 : w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  /* ---------- materials ---------- */
  const tolexMat = new THREE.MeshStandardMaterial({
    color: 0x0e0e10, bumpMap: tolexBump(), bumpScale: 0.035,
    roughness: 0.72, metalness: 0.05, envMapIntensity: 0.3, // satin ABS + pebbled vinyl
  });
  const glossBlockMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0d, roughness: 0.18, metalness: 0.0, envMapIntensity: 1.0,
    clearcoat: 1.0, clearcoatRoughness: 0.14, // glossy black end blocks
  });
  const railMat = new THREE.MeshStandardMaterial({ map: ribTex(), roughness: 0.32, metalness: 0.75, envMapIntensity: 1.0 });
  const matteMat = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.5, metalness: 0.2, envMapIntensity: 0.5 });
  const feltMat = new THREE.MeshStandardMaterial({ color: 0xa01616, roughness: 1.0, metalness: 0.0 });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.5, metalness: 0.4, envMapIntensity: 0.5 });
  const jackMat = new THREE.MeshStandardMaterial({ color: 0xd7d9de, roughness: 0.3, metalness: 0.8 });

  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);

  /* ---------- layout (key zone identical to Synth-5 / Yamada) ---------- */
  const HALF_W = 25, END_W = 2.6;
  const KEY_X0 = -HALF_W + END_W + 0.2, KEY_X1 = HALF_W - END_W - 0.2;
  const HUMP_H = 5.4, RAIL_H = 1.9, KBY = 3.8;
  const TOP_Z0 = -14.5, HUMP_Z1 = -3.4;      // rounded hump lid
  const RAIL_Z0 = HUMP_Z1, RAIL_Z1 = -0.3;    // silver ribbed rail
  const FRONT_Z0 = 0.6, FRONT_Z1 = 13.6;      // keys zone (identical to the others)
  const Z_KEYS = (FRONT_Z0 + FRONT_Z1) / 2 + 0.3;
  const cz = (a, b) => (a + b) / 2, cd = (a, b) => b - a;

  /* ---------- rounded hump lid (tolex) ---------- */
  const hump = rbox(2 * (HALF_W - 0.1), HUMP_H, cd(TOP_Z0, HUMP_Z1), HUMP_H * 0.42, tolexMat);
  hump.position.set(0, HUMP_H / 2, cz(TOP_Z0, HUMP_Z1));
  root.add(hump);

  /* ---------- silver ribbed control rail ---------- */
  const rail = rbox(2 * (HALF_W - 0.1), RAIL_H, cd(RAIL_Z0, RAIL_Z1), 0.18, railMat);
  rail.position.set(0, RAIL_H / 2, cz(RAIL_Z0, RAIL_Z1));
  root.add(rail);

  /* 2 knobs + jack, left side of the rail (matches the reference photos) */
  const railZ = cz(RAIL_Z0, RAIL_Z1);
  [-HALF_W + END_W + 2.2, -HALF_W + END_W + 4.6].forEach((x) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.5, 22), knobMat);
    knob.position.set(x, RAIL_H + 0.25, railZ);
    root.add(knob);
  });
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 20), jackMat);
  jack.rotation.x = Math.PI / 2;
  jack.position.set(-HALF_W + END_W + 0.4, RAIL_H * 0.55, railZ);
  root.add(jack);

  /* "Roads-H" script logo, centered on the rail */
  const logoPlate = rbox(9.5, 0.1, 2.4, 0.1, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.5 }));
  logoPlate.position.set(4, RAIL_H + 0.06, railZ);
  root.add(logoPlate);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.0), new THREE.MeshBasicMaterial({ map: textTex("Roads-H"), transparent: true }));
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(4, RAIL_H + 0.12, railZ);
  root.add(logo);

  /* ---------- red felt strip between the rail and the keys ---------- */
  const felt = rbox(KEY_X1 - KEY_X0, 0.5, 0.55, 0.05, feltMat);
  felt.position.set(0, KBY + 0.85, 0.35);
  root.add(felt);

  /* ---------- pixel ember flicker, glowing along the felt like a tube amp ---------- */
  const embers = pixelPlane(40, 3, 20, 0.42, emberPaint());
  embers.mesh.position.set(0, KBY + 1.12, 0.35);
  root.add(embers.mesh);
  stage.addTicker(embers.update);

  /* ---------- keybed ---------- */
  const keybed = rbox(KEY_X1 - KEY_X0 + 0.4, KBY, cd(FRONT_Z0, FRONT_Z1) + 0.6, 0.15, matteMat);
  keybed.position.set(0, KBY / 2, cz(FRONT_Z0, FRONT_Z1));
  root.add(keybed);

  /* ---------- glossy black end blocks flanking the keyboard ---------- */
  [-1, 1].forEach((s) => {
    const blockH = 4.6;
    const block = rbox(END_W, blockH, cd(RAIL_Z0, FRONT_Z1) + 0.4, END_W * 0.4, glossBlockMat);
    block.position.set(s * (HALF_W - END_W / 2), blockH / 2, cz(RAIL_Z0, FRONT_Z1));
    root.add(block);
  });

  /* ---------- keyboard (shared: identical length + animation) ---------- */
  const keyMeshes = buildKeyboard3D({ root, x0: KEY_X0, x1: KEY_X1, bedY: KBY, zCenter: Z_KEYS });

  stage.start("__rhodes", keyMeshes);

  return stage;
}
