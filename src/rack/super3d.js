/* ============================================================
   Super Synth in 3D (UDO Super 6 study) — compact build,
   modelled on the Synth-5 skeleton: shallow brushed-metal control
   panel with a few labelled sections, a slim divider, wheels on a
   left panel, and the 2-octave keybed taking the front. Steel-blue
   anodized chassis with silver knobs + white slider caps.
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { buildKeyboard3D } from "./keys3d.js";
import { sevenSegTex } from "./screen3d.js";
import { createStage } from "./stage3d.js";
import { pixelPlane, starfieldPaint } from "./pixel3d.js";

/**
 * Builds the super into `host` and starts its render loop.
 * Call the returned stage's dispose() to release its WebGL context.
 */
export function buildSuper(host) {
  const stage = createStage(host);
  const root = stage.root;

  /* ---------- brushed-metal panel texture (blue-anodized, labelled) ---------- */
  const SECTIONS = [["OSC", 0.02, 0.30], ["FILTER", 0.36, 0.26], ["ENVELOPE", 0.64, 0.34]];
  function panelTex() {
    const W = 1024, H = 300, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#2f4c86"; x.fillRect(0, 0, W, H);              // same unibody blue as the chassis
    for (let i = 0; i < 2600; i++) {                             // horizontal brushing
      const y = Math.random() * H, x0 = Math.random() * W, len = 40 + Math.random() * 300;
      const light = Math.random() > 0.5, a = 0.02 + Math.random() * 0.06;
      x.strokeStyle = light ? `rgba(180,200,240,${a})` : `rgba(0,0,0,${a})`;
      x.lineWidth = 1; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
    }
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0.06)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,0.18)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    SECTIONS.forEach(([label, fx, fw]) => {
      const px = fx * W + 6, pw = fw * W - 12;
      x.strokeStyle = "rgba(220,228,244,0.55)"; x.lineWidth = 2;
      x.beginPath(); x.roundRect(px, 30, pw, H - 62, 10); x.stroke();
      x.fillStyle = "#2f4c86"; x.fillRect(px + pw / 2 - 58, 22, 116, 16);
      x.fillStyle = "#eef2fb"; x.font = "bold 15px Arial"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(label, px + pw / 2, 30);
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  function panelBump() {
    const W = 1024, H = 300, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * H, x0 = Math.random() * W, len = 40 + Math.random() * 300;
      const light = Math.random() > 0.5, a = 0.04 + Math.random() * 0.1;
      x.strokeStyle = light ? `rgba(230,230,230,${a})` : `rgba(40,40,40,${a})`;
      x.lineWidth = 1; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  /* ---------- materials ---------- */
  const blueBodyMat = new THREE.MeshStandardMaterial({ color: 0x2f4c86, roughness: 0.42, metalness: 0.5, envMapIntensity: 0.9 });
  const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x24406f, roughness: 0.38, metalness: 0.6, envMapIntensity: 1.0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.4, metalness: 0.6, envMapIntensity: 0.85 });
  const panelTopMat = new THREE.MeshStandardMaterial({
    map: panelTex(), bumpMap: panelBump(), bumpScale: 0.015,
    roughness: 0.36, metalness: 0.8, envMapIntensity: 1.15,     // brushed anodized metal
  });
  const silverMat = new THREE.MeshPhysicalMaterial({ color: 0xd2d6de, roughness: 0.26, metalness: 0.9, envMapIntensity: 1.5, clearcoat: 0.6, clearcoatRoughness: 0.12 });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.5, metalness: 0.35, envMapIntensity: 0.6 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x0a0e18, roughness: 0.7, metalness: 0.12 });
  const whiteCapMat = new THREE.MeshPhysicalMaterial({ color: 0xe6e9f0, roughness: 0.32, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.16 });
  const ptrMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xff3b2e, emissive: 0xe02414, emissiveIntensity: 1.5, roughness: 0.45 });

  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
  const cz = (a, b) => (a + b) / 2, cd = (a, b) => b - a;

  /* ---------- layout — two metal-blue unibodies with a small disconnect ---------- */
  const HALF_W = 26.3;
  const SLABW = 2 * (HALF_W - 0.1);
  const TOPY = 5;              // top control panel height
  const KBY = 3.8;            // bottom unibody / keybed height
  const TOP_Z0 = -15, TOP_Z1 = -3;         // TOP unibody (controls)
  const BOT_Z0 = -2.3, BOT_Z1 = 13.6;      // BOTTOM unibody (border + keys + wheel); ~0.7 gap above
  const BORD_Z1 = 0.2, BORD_H = KBY + 1.0; // middle metal border: raised back lip of the bottom body
  const KEY_Z0 = 1.0, KEY_Z1 = 13.6;
  const keysX0 = -HALF_W + 8.2, keysX1 = HALF_W - 0.9;  // left zone kept clear for the wheel

  /* ---------- bodies ---------- */
  // TOP UNIBODY — solid metal-blue control panel with a brushed labelled face
  const topBody = rbox(SLABW, TOPY, cd(TOP_Z0, TOP_Z1), 0.5, blueBodyMat);
  topBody.position.set(0, TOPY / 2, cz(TOP_Z0, TOP_Z1));
  root.add(topBody);
  const panelFace = new THREE.Mesh(new THREE.PlaneGeometry(SLABW - 1.0, cd(TOP_Z0, TOP_Z1) - 1.0), panelTopMat);
  panelFace.rotation.x = -Math.PI / 2;
  panelFace.position.set(0, TOPY + 0.02, cz(TOP_Z0, TOP_Z1));
  root.add(panelFace);

  // BOTTOM UNIBODY — solid metal-blue keybed slab, a little disconnected from the top
  const botBody = rbox(SLABW, KBY, cd(BOT_Z0, BOT_Z1), 0.4, blueBodyMat);
  botBody.position.set(0, KBY / 2, cz(BOT_Z0, BOT_Z1));
  root.add(botBody);

  // middle metal border — raised blue lip across the back of the bottom unibody
  const border = rbox(SLABW, BORD_H, cd(BOT_Z0, BORD_Z1), 0.28, blueTrimMat);
  border.position.set(0, BORD_H / 2, cz(BOT_Z0, BORD_Z1));
  root.add(border);

  // single sideways pitch wheel on the left, mounted into the metal border
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 1.15, 30), blueTrimMat);
  wheel.rotation.x = Math.PI / 2;          // axis runs front->back, so the wheel rolls left/right
  wheel.position.set(-HALF_W + 4.6, KBY + 0.7, cz(BOT_Z0, BORD_Z1));
  root.add(wheel);

  // raised end lips flanking the keys — sinks the keybed into the unibody instead
  // of leaving the keys looking like they were dropped on top of a flat slab
  const LIP_W = 0.9, LIP_H = KBY + 0.9;
  [-1, 1].forEach((s) => {
    const x = s < 0 ? keysX0 - LIP_W / 2 - 0.05 : keysX1 + LIP_W / 2 + 0.05;
    const lip = rbox(LIP_W, LIP_H, cd(BORD_Z1, BOT_Z1) + 0.2, 0.22, blueTrimMat);
    lip.position.set(x, LIP_H / 2, cz(BORD_Z1, BOT_Z1) + 0.1);
    root.add(lip);
  });

  /* ---------- controls ---------- */
  function knob(x, z, mat = silverMat, s = 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.66 * s, 0.78 * s, 0.6, 26), knobMat);
    body.position.y = TOPY + 0.3; g.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 0.22, 24), mat);
    cap.position.y = TOPY + 0.66; g.add(cap);
    const ptr = rbox(0.09, 0.05, 0.44 * s, 0.014, ptrMat);
    ptr.position.set(0, TOPY + 0.74, 0.2 * s); g.add(ptr);
    g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI * 1.3 - 0.65;
    root.add(g);
  }
  function sliderV(x, z, len = 3.4) {
    const track = rbox(0.34, 0.16, len, 0.06, trackMat);
    track.position.set(x, TOPY + 0.08, z); root.add(track);
    const cap = rbox(0.95, 0.42, 0.66, 0.1, whiteCapMat);
    cap.position.set(x, TOPY + 0.34, z + (Math.random() - 0.5) * len * 0.4);
    root.add(cap);
  }
  function bank(xc, n, sp, z, len) {
    const x0 = xc - ((n - 1) * sp) / 2;
    for (let i = 0; i < n; i++) sliderV(x0 + i * sp, z, len);
  }

  /* section bounds in world space, derived from the same fx/fw fractions
     used to draw the panel outlines — so controls always land inside
     the printed section box, centered and symmetric, never on the line */
  function sectionBounds(fx, fw) {
    const TEXW = 1024, planeW = SLABW - 1.0;
    const pxL = fx * TEXW + 6, pxR = (fx + fw) * TEXW - 6;
    const left = (pxL / TEXW - 0.5) * planeW, right = (pxR / TEXW - 0.5) * planeW;
    return { center: (left + right) / 2, halfW: (right - left) / 2 };
  }
  const SEC = Object.fromEntries(SECTIONS.map(([label, fx, fw]) => [label, sectionBounds(fx, fw)]));

  const ROW_BACK = -12.2, ROW_FRONT = -7.0;

  // OSC — slider bank centered in the section, two knobs symmetric behind it
  bank(SEC.OSC.center, 4, 1.5, ROW_FRONT, 3.4);
  [-1, 1].forEach((s) => knob(SEC.OSC.center + s * 3.2, ROW_BACK, silverMat, 0.9));

  // FILTER — three knobs symmetric about the section centre, screen centered behind
  [-1, 0, 1].forEach((s) => knob(SEC.FILTER.center + s * 2.6, ROW_FRONT, silverMat, 1.1));
  const scrHouse = rbox(4.4, 0.5, 1.7, 0.12, darkMat);
  scrHouse.position.set(SEC.FILTER.center, TOPY + 0.1, ROW_BACK); root.add(scrHouse);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 1.3),
    new THREE.MeshBasicMaterial({ map: sevenSegTex("06", { lit: "#8fd4ff", ghost: "rgba(143,212,255,0.10)", bg: "#04101c", glow: 9 }) })
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(SEC.FILTER.center, TOPY + 0.4, ROW_BACK); root.add(screen);

  // ENVELOPE — ADSR slider bank centered, two knobs symmetric behind it
  bank(SEC.ENVELOPE.center, 4, 1.6, ROW_FRONT, 3.4);
  [-1, 1].forEach((s) => knob(SEC.ENVELOPE.center + s * 4.0, ROW_BACK, silverMat, 0.9));

  // status LEDs, mirrored about the panel's own centre
  [-1, 1].forEach((s) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 14), ledMat);
    l.position.set(s * 21.7, TOPY + 0.08, ROW_BACK); root.add(l);
  });

  /* ---------- SUPER SYNTH logo on the middle metal border ---------- */
  (function () {
    const cw = 512, ch = 72, c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x = c.getContext("2d");
    x.clearRect(0, 0, cw, ch);
    x.fillStyle = "#eef2fb"; x.font = "800 44px Arial, sans-serif";
    x.textAlign = "right"; x.textBaseline = "middle";
    x.fillText("SUPER SYNTH", cw - 8, ch / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.55), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(13, BORD_H + 0.03, cz(BOT_Z0, BORD_Z1));
    root.add(p);
  })();

  /* ---------- pixel starfield, mirroring the logo on the other side of the border ---------- */
  const starfield = pixelPlane(40, 6, 9, 1.4, starfieldPaint());
  starfield.mesh.position.set(-13, BORD_H + 0.03, cz(BOT_Z0, BORD_Z1));
  root.add(starfield.mesh);
  stage.addTicker(starfield.update);

  /* ---------- keyboard (2 octaves, shared) ---------- */
  const keyMeshes = buildKeyboard3D({ root, x0: keysX0, x1: keysX1, bedY: KBY, zCenter: cz(KEY_Z0, KEY_Z1) + 0.3 });

  stage.start("__super", keyMeshes);

  return stage;
}
