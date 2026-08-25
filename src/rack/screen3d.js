/* ============================================================
   Vintage seven-segment display textures.
   Digits are drawn segment by segment (hexagonal bars with real
   gaps between them, slight slant, faint unlit "ghost" segments)
   — the classic 70s/80s LED look, not a font.
   ============================================================ */
import * as THREE from "./vendor/three.module.js";

const SEG_MAP = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg",
  "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg",
  "-": "g", " ": "",
};

export function sevenSegTex(text, {
  lit = "#ff2a14",                    // lit segment color
  ghost = "rgba(255,42,20,0.09)",     // unlit segments stay faintly visible
  bg = "#060101",
  glow = 12,
} = {}) {
  const chars = [...String(text)];
  const DW = 46, DH = 84;   // digit cell
  const T = 9;              // segment thickness
  const GAP = 2.6;          // the visible space between segments
  const SP = 16, PAD = 16;  // char spacing / border padding
  const SLANT = 0.07;       // classic forward lean
  const W = PAD * 2 + chars.length * DW + (chars.length - 1) * SP + Math.ceil(SLANT * DH);
  const H = PAD * 2 + DH;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // slanted digit space
  x.setTransform(1, 0, -SLANT, 1, SLANT * H, 0);

  const hseg = (px, py, len) => {
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + T * 0.55, py - T / 2);
    x.lineTo(px + len - T * 0.55, py - T / 2);
    x.lineTo(px + len, py);
    x.lineTo(px + len - T * 0.55, py + T / 2);
    x.lineTo(px + T * 0.55, py + T / 2);
    x.closePath(); x.fill();
  };
  const vseg = (px, py, len) => {
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + T / 2, py + T * 0.55);
    x.lineTo(px + T / 2, py + len - T * 0.55);
    x.lineTo(px, py + len);
    x.lineTo(px - T / 2, py + len - T * 0.55);
    x.lineTo(px - T / 2, py + T * 0.55);
    x.closePath(); x.fill();
  };

  function drawDigit(ox, segs) {
    const xL = ox + T / 2 + 1, xR = ox + DW - T / 2 - 1;
    const yT = PAD + T / 2 + 1, yM = PAD + DH / 2, yB = PAD + DH - T / 2 - 1;
    const hLen = xR - xL - 2 * GAP, vLen = yM - yT - 2 * GAP;
    const draw = {
      a: () => hseg(xL + GAP, yT, hLen),
      g: () => hseg(xL + GAP, yM, hLen),
      d: () => hseg(xL + GAP, yB, hLen),
      f: () => vseg(xL, yT + GAP, vLen),
      b: () => vseg(xR, yT + GAP, vLen),
      e: () => vseg(xL, yM + GAP, vLen),
      c: () => vseg(xR, yM + GAP, vLen),
    };
    // ghost pass: every segment faintly present (unlit LED look)
    x.shadowBlur = 0; x.fillStyle = ghost;
    for (const s of "abcdefg") draw[s]();
    // lit pass with glow
    x.shadowColor = lit; x.shadowBlur = glow; x.fillStyle = lit;
    for (const s of segs) draw[s]();
    x.shadowBlur = 0;
  }

  chars.forEach((ch, i) => {
    drawDigit(PAD + i * (DW + SP), SEG_MAP[ch] ?? "");
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
