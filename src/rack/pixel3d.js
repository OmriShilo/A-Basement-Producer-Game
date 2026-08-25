/* ============================================================
   Shared pixel-accent system.
   Every instrument keeps its realistic chassis/knobs/keys as-is;
   this module adds small ANIMATED pixel-art displays on top of it
   (chunky hard-edged squares, not a blurry low-res texture) using
   a tiny canvas + THREE.NearestFilter so each cell renders as a
   true flat pixel with no smoothing.

   Accents can react to actual play via noteEnergy(), which reads
   a "note-hit" DOM event dispatched from keys3d.js on every key
   trigger -- purely additive, no coupling to app.js's audio/economy
   code.
   ============================================================ */
import * as THREE from "./vendor/three.module.js";

/* ---------- shared "is anything being played right now" pulse ---------- */
let lastHitAt = -Infinity;
window.addEventListener("note-hit", () => { lastHitAt = performance.now(); });
/** 1.0 right at a key hit, decaying linearly to 0 over holdMs. Time-based
 *  (not per-frame decrement) so it's safe to sample from several accents
 *  across several instruments' render loops at once. */
export function noteEnergy(holdMs = 450) {
  return Math.max(0, 1 - (performance.now() - lastHitAt) / holdMs);
}

/* ---------- tiny nearest-filtered canvas texture, redrawn per frame ---------- */
export function pixelGrid(cols, rows, paint) {
  const c = document.createElement("canvas"); c.width = cols; c.height = rows;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  function update(t, dt) { paint(ctx, cols, rows, t, dt); tex.needsUpdate = true; }
  return { tex, update };
}

/** A flat plane mounted like a screen/plaque, textured with a pixelGrid. */
export function pixelPlane(cols, rows, w, h, paint) {
  const pg = pixelGrid(cols, rows, paint);
  const mat = new THREE.MeshBasicMaterial({ map: pg.tex, transparent: true, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, update: pg.update };
}

/** Classic pixel VU-meter paint function: `cols` bouncing bar columns,
 *  idle gentle motion, boosted + faster-moving while notes are playing. */
export function vuBarsPaint({
  cols = 10, rows = 6,
  colorLow = "#28d15a", colorMid = "#e8d51a", colorHigh = "#ff3b2e", bg = "#050505",
} = {}) {
  const phases = Array.from({ length: cols }, () => Math.random() * Math.PI * 2);
  return (ctx, C, R, t) => {
    const e = noteEnergy();
    ctx.fillStyle = bg; ctx.fillRect(0, 0, C, R);
    for (let col = 0; col < cols; col++) {
      const idle = 0.16 + 0.12 * (Math.sin(t * 2.4 + phases[col]) * 0.5 + 0.5);
      const boost = e * (0.5 + 0.42 * (Math.sin(col * 1.7 + t * 9) * 0.5 + 0.5));
      const lvl = Math.min(1, idle + boost);
      const lit = Math.round(lvl * rows);
      for (let r = 0; r < rows; r++) {
        const fromBottom = rows - 1 - r;
        if (fromBottom >= lit) continue;
        const frac = fromBottom / Math.max(1, rows - 1);
        ctx.fillStyle = frac > 0.7 ? colorHigh : frac > 0.35 ? colorMid : colorLow;
        ctx.fillRect(col, r, 1, 1);
      }
    }
  };
}

/** Scrolling pixel marquee: `text` crawls right-to-left forever.
 *  Canvas text at this tiny resolution + NearestFilter upscaling reads
 *  as chunky pixel type, not a bitmap font, but gets the same effect. */
export function marqueePaint(text, { color = "#7fd4ff", bg = "#04101c", speed = 14, font } = {}) {
  let scrollX = 0;
  const full = text + "     ";
  return (ctx, C, R, t, dt) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, C, R);
    ctx.font = font || `bold ${Math.max(6, R - 1)}px monospace`;
    ctx.fillStyle = color; ctx.textBaseline = "middle";
    const w = ctx.measureText(full).width || 1;
    scrollX = (scrollX + speed * dt) % w;
    let x = -scrollX;
    while (x < C) { ctx.fillText(full, x, R / 2 + 1); x += w; }
  };
}

/** Flickering ember/tube-glow strip: independent per-cell noise, warm
 *  amber-to-white heat gradient, dimmer toward one edge of the strip. */
export function emberPaint({ cols = 40, rows = 3 } = {}) {
  const seeds = Array.from({ length: cols * rows }, () => Math.random() * 10);
  return (ctx, C, R) => {
    const t = performance.now() / 1000;
    for (let y = 0; y < R; y++) {
      for (let x = 0; x < C; x++) {
        const i = y * C + x;
        const n = Math.sin(t * 3 + seeds[i]) * 0.5 + Math.sin(t * 7.3 + seeds[i] * 1.7) * 0.3 + 0.5;
        const heat = Math.max(0, Math.min(1, n * (1 - y / Math.max(1, R))));
        const r = 40 + heat * 215, g = 10 + heat * 110, b = 5 + heat * 40;
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };
}

/** Drifting starfield: a fixed set of stars scroll sideways and twinkle,
 *  twinkle boosted (brighter, more of them visible) while notes play. */
export function starfieldPaint({ cols = 40, rows = 6, bg = "#0d1730", color = "#dff0ff", count = 22 } = {}) {
  const stars = Array.from({ length: count }, () => ({
    x: Math.random() * cols, y: Math.random() * rows,
    phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.9,
  }));
  return (ctx, C, R, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, C, R);
    const e = noteEnergy();
    for (const s of stars) {
      const x = ((s.x + t * s.speed) % C + C) % C;
      const twinkle = Math.sin(t * 3 + s.phase) * 0.5 + 0.5;
      const bright = Math.min(1, twinkle + e * 0.6);
      if (bright < 0.15) continue;
      ctx.globalAlpha = bright;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(s.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  };
}

/** Morphing oscilloscope waveform: slowly blends sine -> square -> saw,
 *  amplitude swells while notes are playing. */
export function waveformPaint({ cols = 48, rows = 12, color = "#ffb020", bg = "#140505" } = {}) {
  return (ctx, C, R, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, C, R);
    const e = noteEnergy();
    const cyc = (Math.sin(t * 0.25) * 0.5 + 0.5) * 2; // 0..2: sine->square->saw
    for (let x = 0; x < C; x++) {
      const phase = (x / C) * Math.PI * 4 + t * 2.4;
      const sine = Math.sin(phase);
      const square = Math.sign(Math.sin(phase)) || 1;
      const saw = ((phase / Math.PI) % 2) - 1;
      const v = cyc < 1 ? sine * (1 - cyc) + square * cyc : square * (2 - cyc) + saw * (cyc - 1);
      const amp = 0.35 + e * 0.35;
      const y = Math.round((R - 1) / 2 - v * amp * (R - 1) / 2);
      if (y >= 0 && y < R) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
    }
  };
}
