/* ============================================================
   Yamada digital piano in 3D (Clavinova-style console).
   Glossy piano-black body — music-rest recess, speaker grille with
   sliders, red felt strip, side arms (touch display left; power,
   volume and YD-875 right), "Yamada" script on the front board.
   Keys come from keys3d.js so they match the Synth-5 exactly.
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { buildKeyboard3D } from "./keys3d.js";
import { sevenSegTex } from "./screen3d.js";
import { createStage } from "./stage3d.js";
import { pixelPlane, marqueePaint } from "./pixel3d.js";

/**
 * Builds the yamada into `host` and starts its render loop.
 * Call the returned stage's dispose() to release its WebGL context.
 */
export function buildYamada(host) {
  const stage = createStage(host);
  const root = stage.root;

  /* ---------- textures ---------- */
  function grilleTex() {
    const W = 512, H = 128, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#08080a"; x.fillRect(0, 0, W, H);
    for (let y = 6; y < H; y += 10) {
      x.strokeStyle = "rgba(58,58,66,0.9)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(6, y); x.lineTo(W - 6, y); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  function textTex(text, { w = 256, h = 64, font = "italic 600 30px Georgia, serif", color = "#e6e6ea", align = "left" } = {}) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.clearRect(0, 0, w, h);
    x.fillStyle = color; x.font = font; x.textBaseline = "middle";
    x.textAlign = align;
    x.fillText(text, align === "left" ? 6 : w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  /* ---------- materials (glossy piano black — no wood) ---------- */
  const glossMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0c0f, roughness: 0.16, metalness: 0.0, envMapIntensity: 1.1,
    clearcoat: 1.0, clearcoatRoughness: 0.12, // polished-ebony finish
  });
  const matteMat = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.5, metalness: 0.2, envMapIntensity: 0.5 });
  const recessMat = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.4 });
  const feltMat = new THREE.MeshStandardMaterial({ color: 0xa01616, roughness: 1.0, metalness: 0.0 });
  const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: 0.8, metalness: 0.2 });
  const sliderMat = new THREE.MeshStandardMaterial({ color: 0x5a5a64, roughness: 0.35, metalness: 0.7 });

  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);

  /* ---------- layout ---------- */
  const HALF_W = 25, ARM_W = 2.4;
  const KEY_X0 = -HALF_W + ARM_W + 0.2, KEY_X1 = HALF_W - ARM_W - 0.2;
  const TOPY = 5.6;                       // top board height
  const KBY = 3.8;                        // keybed height (same tier as Synth-5)
  const TOP_Z0 = -13.5, TOP_Z1 = -0.2;    // top board depth
  const FRONT_Z0 = 0.6, FRONT_Z1 = 13.6;  // keys zone (identical to Synth-5)
  const Z_KEYS = (FRONT_Z0 + FRONT_Z1) / 2 + 0.3;
  const cz = (a, b) => (a + b) / 2, cd = (a, b) => b - a;

  /* ---------- top board (glossy slab) ---------- */
  const topBoard = rbox(2 * (HALF_W - 0.1), TOPY, cd(TOP_Z0, TOP_Z1), 0.3, glossMat);
  topBoard.position.set(0, TOPY / 2, cz(TOP_Z0, TOP_Z1));
  root.add(topBoard);

  // music-rest recess (centered, sunken look)
  const recess = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.2), recessMat);
  recess.rotation.x = -Math.PI / 2;
  recess.position.set(0, TOPY + 0.02, -9.2);
  root.add(recess);

  /* ---------- pixel marquee: scrolling "YAMADA" LED strip in the recess ---------- */
  const marquee = pixelPlane(64, 10, 9, 1.3, marqueePaint("YAMADA  DIGITAL PIANO   ", { color: "#7fd4ff", bg: "#04101c" }));
  marquee.mesh.position.set(0, TOPY + 0.04, -9.2);
  root.add(marquee.mesh);
  stage.addTicker(marquee.update);

  // speaker grille + two sliders
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.6), grilleMat);
  grille.rotation.x = -Math.PI / 2;
  grille.position.set(0, TOPY + 0.02, -3.0);
  root.add(grille);
  [-2.2, 2.2].forEach((x) => {
    const rail = rbox(2.4, 0.12, 0.5, 0.05, matteMat);
    rail.position.set(x, TOPY + 0.08, -1.6);
    root.add(rail);
    const knob = rbox(0.55, 0.3, 0.7, 0.08, sliderMat);
    knob.position.set(x + (x < 0 ? 0.5 : -0.4), TOPY + 0.18, -1.6);
    root.add(knob);
  });

  /* ---------- red felt strip between body and keys ---------- */
  const felt = rbox(KEY_X1 - KEY_X0, 0.5, 0.55, 0.05, feltMat);
  felt.position.set(0, KBY + 0.85, 0.35);
  root.add(felt);

  /* ---------- keybed + front board ---------- */
  const keybed = rbox(KEY_X1 - KEY_X0 + 0.4, KBY, cd(FRONT_Z0, FRONT_Z1) + 0.6, 0.15, matteMat);
  keybed.position.set(0, KBY / 2, cz(FRONT_Z0, FRONT_Z1));
  root.add(keybed);

  const frontBoard = rbox(2 * (HALF_W - 0.1), 3.4, 1.5, 0.2, glossMat);
  frontBoard.position.set(0, 1.7, 14.55);
  root.add(frontBoard);
  // "Yamada" script on the front board's top, left side (like the 2D model)
  const script = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: textTex("Yamada"), transparent: true }));
  script.rotation.x = -Math.PI / 2;
  script.position.set(-HALF_W + 4.6, 3.42, 14.55);
  root.add(script);

  /* ---------- side arms ---------- */
  [-1, 1].forEach((s) => {
    const arm = rbox(ARM_W, 4.9, cd(TOP_Z0, FRONT_Z1) + 0.4, 0.22, glossMat);
    arm.position.set(s * (HALF_W - ARM_W / 2), 4.9 / 2, cz(TOP_Z0, FRONT_Z1));
    root.add(arm);
  });
  // left arm: blue seven-segment display (tempo readout)
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.06),
    new THREE.MeshBasicMaterial({
      map: sevenSegTex("120", { lit: "#7fd4ff", ghost: "rgba(127,212,255,0.10)", bg: "#04101c", glow: 9 }),
    })
  );
  display.rotation.x = -Math.PI / 2;
  display.position.set(-(HALF_W - ARM_W / 2), 4.92, 1.6);
  root.add(display);
  // right arm: power button, volume slider, model label
  const armX = HALF_W - ARM_W / 2;
  const power = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 20), sliderMat);
  power.position.set(armX, 4.98, 0.6);
  root.add(power);
  const volRail = rbox(0.4, 0.1, 2.0, 0.04, matteMat);
  volRail.position.set(armX, 4.95, 2.6);
  root.add(volRail);
  const volKnob = rbox(0.62, 0.26, 0.5, 0.07, sliderMat);
  volKnob.position.set(armX, 5.02, 2.2);
  root.add(volKnob);
  const modelLbl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), new THREE.MeshBasicMaterial({
    map: textTex("YD-875", { font: "600 22px Arial", color: "#8a8a94", align: "center" }), transparent: true,
  }));
  modelLbl.rotation.x = -Math.PI / 2;
  modelLbl.rotation.z = Math.PI / 2;
  modelLbl.position.set(armX, 4.92, 5.6);
  root.add(modelLbl);

  /* ---------- keyboard (shared with Synth-5: same length + animation) ---------- */
  const keyMeshes = buildKeyboard3D({ root, x0: KEY_X0, x1: KEY_X1, bedY: KBY, zCenter: Z_KEYS });

  stage.start("__yamada", keyMeshes);

  return stage;
}
