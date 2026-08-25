/* ============================================================
   Synth-5 in 3D (Three.js, vendored locally) — top-view build.
   Distinct pieces: black control panel -> narrow textured-wood
   divider -> keys, with pitch/mod wheels on a black panel at the
   left. Procedural wood + silkscreen textures, matte materials,
   soft shadows. Keys raycast to window.hit().
   ============================================================ */
import * as THREE from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { buildKeyboard3D } from "./keys3d.js";
import { sevenSegTex } from "./screen3d.js";
import { createStage } from "./stage3d.js";
import { pixelPlane, vuBarsPaint } from "./pixel3d.js";

/**
 * Builds the synth5 into `host` and starts its render loop.
 * Call the returned stage's dispose() to release its WebGL context.
 */
export function buildSynth5(host) {
  const stage = createStage(host);
  const root = stage.root;

  /* ---------- procedural textures ---------- */
  /* Rich walnut: color + matching bump map so the grain catches light. */
  function makeWood(dir, repX, repY) {
    const s = 1024;
    const col = document.createElement("canvas"); col.width = col.height = s;
    const bmp = document.createElement("canvas"); bmp.width = bmp.height = s;
    const cx = col.getContext("2d"), bx = bmp.getContext("2d");
    const base = dir === "h" ? cx.createLinearGradient(0, 0, 0, s) : cx.createLinearGradient(0, 0, s, 0);
    base.addColorStop(0, "#7c5129"); base.addColorStop(0.35, "#6b4423");
    base.addColorStop(0.7, "#5d3a1e"); base.addColorStop(1, "#4e2f17");
    cx.fillStyle = base; cx.fillRect(0, 0, s, s);
    bx.fillStyle = "#808080"; bx.fillRect(0, 0, s, s);
    const strokeBoth = (colStyle, bmpStyle, lw, path) => {
      [[cx, colStyle], [bx, bmpStyle]].forEach(([ctx, style]) => {
        ctx.strokeStyle = style; ctx.lineWidth = lw;
        ctx.beginPath(); path(ctx); ctx.stroke();
      });
    };
    const grainPath = (p, wv, e) => (ctx) => {
      if (dir === "v") { ctx.moveTo(p, 0); ctx.bezierCurveTo(p + wv, s / 3, p - wv, 2 * s / 3, p + e, s); }
      else { ctx.moveTo(0, p); ctx.bezierCurveTo(s / 3, p + wv, 2 * s / 3, p - wv, s, p + e); }
    };
    // broad ring bands (soft hue shifts between amber and dark walnut)
    for (let i = 0; i < 14; i++) {
      const p = Math.random() * s, w0 = 14 + Math.random() * 44, a = 0.05 + Math.random() * 0.08;
      const dark = Math.random() > 0.45, wv = (Math.random() - 0.5) * 60;
      strokeBoth(dark ? `rgba(52,30,12,${a})` : `rgba(180,130,74,${a})`,
                 dark ? `rgba(96,96,96,${a})` : `rgba(168,168,168,${a})`, w0, grainPath(p, wv, 0));
    }
    // long fine grain streaks
    for (let i = 0; i < 200; i++) {
      const p = Math.random() * s, lw = 0.5 + Math.random() * 1.6;
      const dark = Math.random() > 0.4, a = 0.08 + Math.random() * 0.2;
      const wv = (Math.random() - 0.5) * 24, e = (Math.random() - 0.5) * 8;
      strokeBoth(dark ? `rgba(40,22,9,${a})` : `rgba(192,142,86,${a * 0.8})`,
                 dark ? `rgba(58,58,58,${a})` : `rgba(210,210,210,${a})`, lw, grainPath(p, wv, e));
    }
    // fine pores aligned with the grain
    for (let i = 0; i < 9000; i++) {
      const px = Math.random() * s, py = Math.random() * s, l = 1 + Math.random() * 3, a = Math.random() * 0.08;
      cx.fillStyle = `rgba(22,11,4,${a})`; bx.fillStyle = `rgba(60,60,60,${a})`;
      if (dir === "v") { cx.fillRect(px, py, 1, l); bx.fillRect(px, py, 1, l); }
      else { cx.fillRect(px, py, l, 1); bx.fillRect(px, py, l, 1); }
    }
    const mk = (c2, srgb) => {
      const t = new THREE.CanvasTexture(c2);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY); t.anisotropy = 8;
      return t;
    };
    return { map: mk(col, true), bump: mk(bmp, false) };
  }

  const SECTIONS = [["POLY-MOD", 0.01, 0.19], ["OSCILLATOR A", 0.21, 0.20], ["MIXER", 0.42, 0.12], ["FILTER", 0.55, 0.21], ["AMPLIFIER", 0.77, 0.22]];
  function panelTex() {
    const W = 1024, H = 288, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#141417"; x.fillRect(0, 0, W, H);
    // brushed-metal horizontal streaks (under the silkscreen)
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * H, x0 = Math.random() * W, len = 40 + Math.random() * 300;
      const light = Math.random() > 0.5, a = 0.015 + Math.random() * 0.05;
      x.strokeStyle = light ? `rgba(205,212,232,${a})` : `rgba(0,0,0,${a})`;
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
    }
    // faint vertical sheen
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0.05)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,0.15)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const secs = SECTIONS;
    secs.forEach(([label, fx, fw]) => {
      const px = fx * W + 6, pw = fw * W - 12;
      x.strokeStyle = "rgba(205,205,212,0.55)"; x.lineWidth = 2;
      x.beginPath(); x.roundRect(px, 34, pw, H - 70, 10); x.stroke();
      // break the top line for a centered label
      x.fillStyle = "#141417"; x.fillRect(px + pw / 2 - 56, 26, 112, 16);
      x.fillStyle = "#e2e2ea"; x.font = "bold 15px Arial"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(label, px + pw / 2, 34);
      // tiny "0 .. 10" hints
      x.fillStyle = "rgba(170,170,180,0.5)"; x.font = "9px Arial";
      x.fillText("0      10", px + pw / 2, H - 26);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  /* grayscale streak bump for the brushed panel */
  function panelBump() {
    const W = 1024, H = 288, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * H, x0 = Math.random() * W, len = 40 + Math.random() * 300;
      const light = Math.random() > 0.5, a = 0.04 + Math.random() * 0.1;
      x.strokeStyle = light ? `rgba(230,230,230,${a})` : `rgba(40,40,40,${a})`;
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
    return t;
  }

  /* ---------- materials ---------- */
  const woodV = makeWood("v", 1, 4), woodH = makeWood("h", 6, 1);
  const woodCheekMat = new THREE.MeshPhysicalMaterial({
    map: woodV.map, bumpMap: woodV.bump, bumpScale: 0.03,
    roughness: 0.55, metalness: 0.0, envMapIntensity: 0.45,
    clearcoat: 0.25, clearcoatRoughness: 0.35, // satin oiled-walnut finish
  });
  const woodDivMat = new THREE.MeshPhysicalMaterial({
    map: woodH.map, bumpMap: woodH.bump, bumpScale: 0.03,
    roughness: 0.55, metalness: 0.0, envMapIntensity: 0.45,
    clearcoat: 0.25, clearcoatRoughness: 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.38, metalness: 0.65, envMapIntensity: 0.85 });
  const panelTopMat = new THREE.MeshStandardMaterial({
    map: panelTex(), bumpMap: panelBump(), bumpScale: 0.015,
    roughness: 0.34, metalness: 0.78, envMapIntensity: 1.15, // brushed anodized metal
  });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.55 });
  const knobCapMat = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.55, metalness: 0.3, envMapIntensity: 0.5 });
  const ptrMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.4 });
  /* key materials + geometry live in keys3d.js (shared across instruments) */
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xff3b2e, emissive: 0xe02414, emissiveIntensity: 1.5, roughness: 0.45 });
  const switchMat = new THREE.MeshStandardMaterial({ color: 0x26262a, roughness: 0.5, metalness: 0.3 });

  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);

  /* ---------- layout constants ---------- */
  const BORDER = 1.2;                                  // wood frame thickness (shared: cheek width == top-bar depth)
  const HALF_W = 26.3, CW = BORDER, INNER = HALF_W - CW; // inner x range
  const TOPY = 5;          // knob-panel top surface
  const FRAME_T = CW;              // top bar depth, same as the side-cheek width ("same width as them")
  const FRAME_H = 3.0;             // shared frame height (cheeks + top bar) -- clearly lower than the panel
  const GAP = 0.3;                 // recessed channel separating the panel from the frame
  const CHANNEL_Y = 1.3;           // channel floor: below both the panel and the frame (reads as a groove)
  const KBY = 3.8;         // keys/wheels tier (~10% lower than the knob panel)
  const PANEL_Z0 = -14, PANEL_Z1 = -2;                 // control panel depth
  const BACK_Z = PANEL_Z0 - GAP - FRAME_T;             // back edge of the frame (behind the channel)
  const DIV_Z0 = -2, DIV_Z1 = 0.6;                     // wood divider
  const FRONT_Z0 = 0.6, FRONT_Z1 = 13.6;               // keys / wheels
  const cz = (a, b) => (a + b) / 2, cd = (a, b) => b - a;

  /* ---------- bodies ---------- */
  // control-panel block (dark) + silkscreen plane on top
  const panelBlk = rbox(2 * INNER, TOPY, cd(PANEL_Z0, PANEL_Z1), 0.25, darkMat);
  panelBlk.position.set(0, TOPY / 2, cz(PANEL_Z0, PANEL_Z1));
  root.add(panelBlk);
  const panelFace = new THREE.Mesh(new THREE.PlaneGeometry(2 * INNER - 0.4, cd(PANEL_Z0, PANEL_Z1) - 0.4), panelTopMat);
  panelFace.rotation.x = -Math.PI / 2;
  panelFace.position.set(0, TOPY + 0.02, cz(PANEL_Z0, PANEL_Z1));
  root.add(panelFace);

  // wood divider
  const divider = rbox(2 * INNER, TOPY, cd(DIV_Z0, DIV_Z1), 0.18, woodDivMat);
  divider.position.set(0, TOPY / 2, cz(DIV_Z0, DIV_Z1));
  root.add(divider);

  // front section: black keybed (right) + wheel panel (left)
  const WHEEL_W = 7;
  const keysX0 = -INNER + WHEEL_W, keysX1 = INNER;      // keys area
  const keybed = rbox(cd(keysX0, keysX1), KBY, cd(FRONT_Z0, FRONT_Z1), 0.18, darkMat);
  keybed.position.set(cz(keysX0, keysX1), KBY / 2, cz(FRONT_Z0, FRONT_Z1));
  root.add(keybed);
  const wheelPanel = rbox(WHEEL_W, KBY + 0.2, cd(FRONT_Z0, FRONT_Z1), 0.18, darkMat);
  wheelPanel.position.set(-INNER + WHEEL_W / 2, (KBY + 0.2) / 2, cz(FRONT_Z0, FRONT_Z1));
  root.add(wheelPanel);

  // thin wood end cheeks (L/R) — extended all the way back to physically meet the top bar
  [-1, 1].forEach((s) => {
    const cheek = rbox(CW, FRAME_H, FRONT_Z1 - BACK_Z, 0.18, woodCheekMat);
    cheek.position.set(s * (HALF_W - CW / 2), FRAME_H / 2, cz(BACK_Z, FRONT_Z1));
    root.add(cheek);
  });
  // recessed dark channel: a low valley strip, INNER width only, so it never crosses the cheeks
  const channel = rbox(2 * INNER, CHANNEL_Y, GAP, 0.12, darkMat);
  channel.position.set(0, CHANNEL_Y / 2, cz(PANEL_Z0 - GAP, PANEL_Z0));
  root.add(channel);
  // top bar: full width, same thickness + height as the cheeks, touching them at both corners
  const topBorder = rbox(2 * HALF_W, FRAME_H, FRAME_T, 0.18, woodDivMat);
  topBorder.position.set(0, FRAME_H / 2, cz(BACK_Z, BACK_Z + FRAME_T));
  root.add(topBorder);

  /* ---------- knobs / switches / LED on the panel ---------- */
  function knob(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.7, 28), knobMat);
    body.position.y = TOPY + 0.35; body.castShadow = true; g.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.2, 24), knobCapMat);
    cap.position.y = TOPY + 0.74; g.add(cap);
    const ptr = rbox(0.1, 0.06, 0.5, 0.016, ptrMat);
    ptr.position.set(0, TOPY + 0.8, 0.24); g.add(ptr);
    g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI * 1.4 - 0.7;
    root.add(g);
  }
  function toggle(x, z) {
    const base = rbox(0.85, 0.4, 0.85, 0.1, switchMat);
    base.position.set(x, TOPY + 0.2, z); base.castShadow = true; root.add(base);
    const nub = rbox(0.36, 0.5, 0.36, 0.06, ptrMat);
    nub.position.set(x, TOPY + 0.5, z - 0.14); root.add(nub);
  }
  // knobs clustered inside each silkscreen section (never on the borders)
  const SECW = 2 * INNER - 0.4;
  [-11, -5.6].forEach((z) => {
    SECTIONS.forEach(([, fx, fw]) => {
      const cxs = (fx + fw / 2 - 0.5) * SECW;
      const wU = fw * SECW;
      const halfInner = wU / 2 - 1.7;
      const n = Math.max(1, Math.round(wU / 3.0));
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? cxs : cxs - halfInner + (2 * halfInner) * (i / (n - 1));
        knob(x, z);
      }
    });
  });
  const ledHousing = rbox(5, 0.6, 2.0, 0.12, darkMat);
  ledHousing.position.set(6, TOPY + 0.1, -3.3); root.add(ledHousing);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.5), new THREE.MeshBasicMaterial({ map: sevenSegTex("01-12") }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(6, TOPY + 0.42, -3.3); root.add(screen);

  /* ---------- pixel VU meter (mirrors the seven-seg screen on the left) ---------- */
  const vuHousing = rbox(5, 0.6, 2.0, 0.12, darkMat);
  vuHousing.position.set(-6, TOPY + 0.1, -3.3); root.add(vuHousing);
  const vu = pixelPlane(10, 6, 4.2, 1.5, vuBarsPaint());
  vu.mesh.position.set(-6, TOPY + 0.42, -3.3); root.add(vu.mesh);
  stage.addTicker(vu.update);

  /* ---------- pitch / mod wheels (left panel) ---------- */
  [-INNER + 2.4, -INNER + 5.0].forEach((x) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.3, 28), knobMat);
    w.rotation.z = Math.PI / 2;            // axis along X -> rolls front/back
    w.position.set(x, KBY + 0.5, cz(FRONT_Z0, FRONT_Z1)); w.castShadow = true;
    root.add(w);
  });

  /* ---------- keyboard (2 octaves, shared builder) ---------- */
  const keyMeshes = buildKeyboard3D({
    root, x0: keysX0, x1: keysX1, bedY: KBY,
    zCenter: cz(FRONT_Z0, FRONT_Z1) + 0.3,
  });

  /* ---------- SYNTH-5 label on the wood divider ---------- */
  (function () {
    const cw = 256, ch = 64, c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x = c.getContext("2d");
    x.clearRect(0, 0, cw, ch);
    x.fillStyle = "#0c0c0c"; x.beginPath(); x.roundRect(8, 14, cw - 16, ch - 28, 8); x.fill();
    x.fillStyle = "#e9e9f0"; x.font = "italic bold 26px Georgia, serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("SYNTH-5", cw / 2, ch / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(16, TOPY + 0.03, cz(DIV_Z0, DIV_Z1));
    root.add(p);
  })();

  stage.start("__synth5", keyMeshes);

  return stage;
}
