/* ============================================================
   MORD 4 in 3D (compact stage-keyboard study) — modelled on the
   Synth-5 skeleton: a unibody red control panel (brushed-metal face,
   same red as the chassis) with a few labelled sections (ORGAN
   drawbars+knobs · PIANO knobs · SYNTH knobs), a slim divider,
   pitch/mod wheels on a left panel, and the 2-octave waterfall
   keybed up front.
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { buildKeyboard3D } from "./keys3d.js";
import { createStage } from "./stage3d.js";
import { pixelPlane, waveformPaint } from "./pixel3d.js";

/**
 * Builds the nord into `host` and starts its render loop.
 * Call the returned stage's dispose() to release its WebGL context.
 */
export function buildNord(host) {
  const stage = createStage(host);
  const root = stage.root;

  /* ---------- brushed-black panel texture (labelled) ---------- */
  const SECTIONS = [["ORGAN", 0.02, 0.32], ["PIANO", 0.38, 0.22], ["SYNTH", 0.62, 0.36]];
  function panelTex() {
    const W = 1024, H = 300, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#c4141f"; x.fillRect(0, 0, W, H);              // same unibody red as the chassis
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * H, x0 = Math.random() * W, len = 40 + Math.random() * 300;
      const light = Math.random() > 0.5, a = 0.015 + Math.random() * 0.05;
      x.strokeStyle = light ? `rgba(255,200,200,${a})` : `rgba(0,0,0,${a})`;
      x.lineWidth = 1; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
    }
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0.06)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,0.18)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    SECTIONS.forEach(([label, fx, fw]) => {
      const px = fx * W + 6, pw = fw * W - 12;
      x.strokeStyle = "rgba(20,10,10,0.65)"; x.lineWidth = 2;                 // dark outline reads against the red
      x.beginPath(); x.roundRect(px, 30, pw, H - 62, 10); x.stroke();
      x.fillStyle = "#c4141f"; x.fillRect(px + pw / 2 - 52, 22, 104, 16);
      x.fillStyle = "#2a0808"; x.font = "bold 15px Arial"; x.textAlign = "center"; x.textBaseline = "middle";
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
  const redBodyMat = new THREE.MeshPhysicalMaterial({ color: 0xc4141f, roughness: 0.36, metalness: 0.2, envMapIntensity: 0.9, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.4, metalness: 0.6, envMapIntensity: 0.85 });
  const panelTopMat = new THREE.MeshStandardMaterial({
    map: panelTex(), bumpMap: panelBump(), bumpScale: 0.015,
    roughness: 0.36, metalness: 0.78, envMapIntensity: 1.1,
  });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.48, metalness: 0.35, envMapIntensity: 0.6 });
  const knobCapMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.3 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x161619, roughness: 0.7, metalness: 0.1 });
  const dbBlack = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.5, metalness: 0.2 });
  const dbWhite = new THREE.MeshStandardMaterial({ color: 0xe8e8ec, roughness: 0.42 });
  const dbRed = new THREE.MeshStandardMaterial({ color: 0xb2201f, roughness: 0.45, metalness: 0.1 });
  const ptrMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f4, roughness: 0.4 });

  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
  const cz = (a, b) => (a + b) / 2, cd = (a, b) => b - a;

  /* ---------- layout (compact, Synth-5 proportions) ---------- */
  const HALF_W = 26.3, BORDER = 1.2, CW = BORDER, INNER = HALF_W - CW;
  const TOPY = 5;
  const FRAME_H = 3.0, FRAME_T = CW, GAP = 0.3, CHANNEL_Y = 1.3;
  const KBY = 3.8;
  const PANEL_Z0 = -14, PANEL_Z1 = -2;
  const BACK_Z = PANEL_Z0 - GAP - FRAME_T;
  const DIV_Z0 = -2, DIV_Z1 = 0.6;
  const FRONT_Z0 = 0.6, FRONT_Z1 = 13.6;

  /* ---------- bodies ---------- */
  const panelBlk = rbox(2 * INNER, TOPY, cd(PANEL_Z0, PANEL_Z1), 0.25, redBodyMat);
  panelBlk.position.set(0, TOPY / 2, cz(PANEL_Z0, PANEL_Z1));
  root.add(panelBlk);
  const panelFace = new THREE.Mesh(new THREE.PlaneGeometry(2 * INNER - 0.4, cd(PANEL_Z0, PANEL_Z1) - 0.4), panelTopMat);
  panelFace.rotation.x = -Math.PI / 2;
  panelFace.position.set(0, TOPY + 0.02, cz(PANEL_Z0, PANEL_Z1));
  root.add(panelFace);

  // red divider strip
  const divider = rbox(2 * INNER, TOPY, cd(DIV_Z0, DIV_Z1), 0.16, redBodyMat);
  divider.position.set(0, TOPY / 2, cz(DIV_Z0, DIV_Z1));
  root.add(divider);

  // front: dark keybed (right) + wheel panel (left)
  const WHEEL_W = 7;
  const keysX0 = -INNER + WHEEL_W, keysX1 = INNER;
  const keybed = rbox(cd(keysX0, keysX1), KBY, cd(FRONT_Z0, FRONT_Z1), 0.18, darkMat);
  keybed.position.set(cz(keysX0, keysX1), KBY / 2, cz(FRONT_Z0, FRONT_Z1));
  root.add(keybed);
  const wheelPanel = rbox(WHEEL_W, KBY + 0.2, cd(FRONT_Z0, FRONT_Z1), 0.18, darkMat);
  wheelPanel.position.set(-INNER + WHEEL_W / 2, (KBY + 0.2) / 2, cz(FRONT_Z0, FRONT_Z1));
  root.add(wheelPanel);

  // red end cheeks + top bar (chassis frame)
  [-1, 1].forEach((s) => {
    const cheek = rbox(CW, FRAME_H, FRONT_Z1 - BACK_Z, 0.16, redBodyMat);
    cheek.position.set(s * (HALF_W - CW / 2), FRAME_H / 2, cz(BACK_Z, FRONT_Z1));
    root.add(cheek);
  });
  const channel = rbox(2 * INNER, CHANNEL_Y, GAP, 0.12, darkMat);
  channel.position.set(0, CHANNEL_Y / 2, cz(PANEL_Z0 - GAP, PANEL_Z0));
  root.add(channel);
  const topBar = rbox(2 * HALF_W, FRAME_H, FRAME_T, 0.16, redBodyMat);
  topBar.position.set(0, FRAME_H / 2, cz(BACK_Z, BACK_Z + FRAME_T));
  root.add(topBar);

  /* ---------- controls ---------- */
  function knob(x, z, s = 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.76 * s, 0.88 * s, 0.5, 26), knobMat);
    body.position.y = TOPY + 0.25; g.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.58 * s, 0.58 * s, 0.18, 24), knobCapMat);
    cap.position.y = TOPY + 0.59; g.add(cap);
    const ptr = rbox(0.1, 0.05, 0.48 * s, 0.016, ptrMat);
    ptr.position.set(0, TOPY + 0.67, 0.22 * s); g.add(ptr);
    g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI * 1.3 - 0.65;
    root.add(g);
  }
  // n evenly-spaced offsets from -halfSpan to +halfSpan (n=1 -> just 0)
  function spread(n, halfSpan) {
    if (n <= 1) return [0];
    const step = (2 * halfSpan) / (n - 1);
    return Array.from({ length: n }, (_, i) => -halfSpan + i * step);
  }
  // half-span for a row of knobs: a fixed inset from the section's drawn
  // outline (matches the Synth-5 layout's own margin), not a fraction of the
  // section width — so knobs fill the box instead of huddling near center
  function knobRowHalfSpan(sec) { return sec.halfW - 1.7; }
  function drawbar(x, z, len, capMat) {
    const track = rbox(0.32, 0.15, len, 0.05, trackMat);
    track.position.set(x, TOPY + 0.075, z); root.add(track);
    const cap = rbox(0.78, 0.5, 0.72, 0.08, capMat);
    cap.position.set(x, TOPY + 0.33, z + (Math.random() - 0.3) * len * 0.35);
    root.add(cap);
  }

  /* section bounds in world space, derived from the same fx/fw fractions
     used to draw the panel outlines — so controls always land inside
     the printed section box, centered and symmetric, never on the line */
  function sectionBounds(fx, fw) {
    const TEXW = 1024, planeW = 2 * INNER - 0.4;
    const pxL = fx * TEXW + 6, pxR = (fx + fw) * TEXW - 6;
    const left = (pxL / TEXW - 0.5) * planeW, right = (pxR / TEXW - 0.5) * planeW;
    return { center: (left + right) / 2, halfW: (right - left) / 2 };
  }
  const SEC = Object.fromEntries(SECTIONS.map(([label, fx, fw]) => [label, sectionBounds(fx, fw)]));

  // two rows, both pulled well inside the outline's front/back edges
  const ROW_BACK = -10.2, ROW_FRONT = -5.8;

  // ORGAN — 6 drawbars + 4 knobs, filling the section width
  const dbCols = [dbBlack, dbWhite, dbWhite, dbBlack, dbRed, dbWhite];
  {
    const dbHalf = SEC.ORGAN.halfW - 1.3;
    spread(dbCols.length, dbHalf).forEach((x, i) => drawbar(SEC.ORGAN.center + x, ROW_FRONT, 3.0, dbCols[i]));
  }
  spread(4, knobRowHalfSpan(SEC.ORGAN)).forEach((x) => knob(SEC.ORGAN.center + x, ROW_BACK, 1.05));

  // PIANO — 6 knobs in a 3x2 grid (same x columns both rows)
  spread(3, knobRowHalfSpan(SEC.PIANO)).forEach((x) => {
    knob(SEC.PIANO.center + x, ROW_FRONT, 1.0);
    knob(SEC.PIANO.center + x, ROW_BACK, 1.0);
  });

  // SYNTH — 8 knobs in a 4x2 grid
  spread(4, knobRowHalfSpan(SEC.SYNTH)).forEach((x) => {
    knob(SEC.SYNTH.center + x, ROW_FRONT, 1.0);
    knob(SEC.SYNTH.center + x, ROW_BACK, 0.9);
  });

  /* ---------- MORD 4 logo on the divider ---------- */
  (function () {
    const cw = 420, ch = 96, c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x = c.getContext("2d");
    x.clearRect(0, 0, cw, ch);
    x.fillStyle = "#f2f2f4";
    x.font = "italic 800 60px Georgia, 'Times New Roman', serif";
    x.textAlign = "left"; x.textBaseline = "middle";
    x.fillText("mord", 6, ch / 2 + 1);
    x.fillStyle = "#f2c9cc"; x.font = "700 40px Arial, sans-serif";
    x.fillText("4", 210, ch / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(-18, TOPY + 0.03, cz(DIV_Z0, DIV_Z1));
    root.add(p);
  })();

  /* ---------- pixel waveform screen on the divider, mirroring the logo ---------- */
  const waveHouse = rbox(7.6, 0.4, 1.9, 0.1, darkMat);
  waveHouse.position.set(17, TOPY + 0.08, cz(DIV_Z0, DIV_Z1)); root.add(waveHouse);
  const wave = pixelPlane(48, 12, 6.8, 1.5, waveformPaint());
  wave.mesh.position.set(17, TOPY + 0.3, cz(DIV_Z0, DIV_Z1));
  root.add(wave.mesh);
  stage.addTicker(wave.update);

  /* ---------- pitch / mod wheels (left panel) ---------- */
  [-INNER + 2.4, -INNER + 5.0].forEach((x) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.3, 28), knobMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, KBY + 0.5, cz(FRONT_Z0, FRONT_Z1));
    root.add(w);
  });

  /* ---------- keyboard (2 octaves, shared) ---------- */
  const keyMeshes = buildKeyboard3D({ root, x0: keysX0, x1: keysX1, bedY: KBY, zCenter: cz(FRONT_Z0, FRONT_Z1) + 0.3 });

  stage.start("__nord", keyMeshes);

  return stage;
}
