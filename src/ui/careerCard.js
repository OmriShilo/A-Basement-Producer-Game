import { overallRating, ratingTier } from '../engine/rating.js';
import { STANDING } from '../engine/status.js';
import { turningPoints, topPlacements } from '../engine/game.js';

/* Photocopy / Y2K career card — same language as the screens:
   white stock, 3px black rules, Anton display, chrome bevel on the name,
   a red tape-splice stripe, and a marker tag for the ending. */

const PANEL = '#ffffff';
const INK = '#111111';
const SIGNAL = '#C81E1E';
const SUB = '#555555';
const DEAD = '#cccccc';

const ANTON = 'Anton, Haettenschweiler, "Arial Narrow", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';
const COURIER = '"Courier Prime", "Courier New", Courier, monospace';
const MARKER = '"Permanent Marker", cursive';

const W = 900;
const MIN_H = 820;
const M = 54;

function wrap(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      yy += lh;
      line = w;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lh; }
  return yy;
}

function rule(ctx, x1, y, x2, weight = 3, color = INK) {
  ctx.fillStyle = color;
  ctx.fillRect(x1, y, x2 - x1, weight);
}

function tracking(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx;
}

/** The chrome bevel gradient from the design, sized to the text box. */
function chromeFill(ctx, y, size) {
  const g = ctx.createLinearGradient(0, y - size, 0, y + size * 0.25);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.2, '#cfcfcf');
  g.addColorStop(0.45, '#7a7a7a');
  g.addColorStop(0.55, '#f5f5f5');
  g.addColorStop(0.75, '#8c8c8c');
  g.addColorStop(1, '#e8e8e8');
  return g;
}

function chromeText(ctx, text, x, y, size, strokeW = 1) {
  ctx.font = `${size}px ${ANTON}`;
  ctx.fillStyle = chromeFill(ctx, y, size);
  ctx.fillText(text, x, y);
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
}

/** Diagonal red/white tape splice, matching the CSS repeating-linear-gradient. */
function splice(ctx, x, y, w, h, color = SIGNAL) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = PANEL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  for (let i = -h; i < w + h; i += 20) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function star(ctx, cx, cy, r, rot, color = INK) {
  const pts = [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const X = ((px - 50) / 50) * r;
    const Y = ((py - 50) / 50) * r;
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Marker text with the stacked-outline treatment (no blur shadows). */
function markerText(ctx, text, x, y, size, fill, outline, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.font = `${size}px ${MARKER}`;
  ctx.fillStyle = outline;
  for (const [dx, dy] of [[2, 2], [-2, -2], [2, -2], [-2, 2], [3, 3]]) ctx.fillText(text, dx, dy);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function drawCareerCard(canvas, s, producerName) {
  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = 4200;
  const measured = paint(probe.getContext('2d'), s, producerName, 4200);

  const dpr = 2;
  const H = Math.max(MIN_H, measured + 150);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  paint(ctx, s, producerName, H);
  return canvas;
}

function paint(ctx, s, producerName, H) {
  const RW = W - M * 2;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, W, H);

  // outer 3px frame
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

  // tape splice across the head
  splice(ctx, M, 34, RW, 18);

  let y = 96;
  ctx.font = `700 13px ${MONO}`;
  ctx.fillStyle = INK;
  tracking(ctx, '★ BASEMENT — CAREER CARD', M, y, 3);

  // producer name in chrome
  y += 66;
  chromeText(ctx, (producerName || 'Unnamed Producer').toUpperCase(), M, y, 54, 1.2);

  y += 26;
  ctx.font = `400 14px ${MONO}`;
  ctx.fillStyle = SUB;
  ctx.fillText(`14 — ${s.retiredAge}   ·   ${s.retiredAge - 14} YEARS   ·   ${s.voluntary ? 'RETIRED' : 'RAN OUT OF ROAD'}`, M, y);

  y += 22;
  rule(ctx, M, y, W - M);

  // standing block — a name, not a tier
  y += 30;
  ctx.font = `24px ${ANTON}`;
  const chipW = ctx.measureText(STANDING).width + 30;
  ctx.fillStyle = '#111111';
  ctx.fillRect(M, y - 22, chipW, 36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(M + 1.5, y - 20.5, chipW - 3, 33);
  ctx.fillStyle = '#fff';
  ctx.fillText(STANDING, M + 15, y + 4);

  if (s.snapshot.architect) {
    markerText(ctx, 'underground canon', M + chipW + 34, y + 6, 26, SIGNAL, '#fff', -6);
  }

  y += 44;
  rule(ctx, M, y, W - M, 3, DEAD);

  // ---- awards
  y += 32;
  ctx.font = `700 12px ${MONO}`;
  ctx.fillStyle = SUB;
  tracking(ctx, 'AWARDS', M, y, 3);
  y += 24;
  const a = s.awards;
  const rows = [['Grammy', a.grammyWins, a.grammyNoms], ['Oscar', a.oscarWins, a.oscarNoms], ['Emmy', a.emmyWins, a.emmyNoms]]
    .filter((r) => r[2] > 0);
  if (!rows.length) {
    ctx.font = `400 18px ${COURIER}`;
    ctx.fillStyle = SUB;
    ctx.fillText('None. Not even a nomination.', M, y);
    y += 26;
  } else {
    for (const [nm, won, nom] of rows) {
      ctx.font = `22px ${ANTON}`;
      ctx.fillStyle = INK;
      ctx.fillText(nm.toUpperCase(), M, y);
      ctx.font = `700 15px ${MONO}`;
      ctx.fillStyle = won > 0 ? SIGNAL : SUB;
      const t = `${won} WON / ${nom} NOM`;
      ctx.fillText(t, W - M - ctx.measureText(t).width, y);
      y += 30;
    }
  }

  // ---- certifications
  y += 12;
  ctx.font = `700 12px ${MONO}`;
  ctx.fillStyle = SUB;
  tracking(ctx, 'CERTIFICATIONS', M, y, 3);
  y += 26;
  const c = s.certs;
  const certs = [['GOLD', c.gold], ['PLATINUM', c.platinum], ['MULTI', c.multi], ['DIAMOND', c.diamond]].filter((r) => r[1] > 0);
  if (!certs.length) {
    ctx.font = `400 18px ${COURIER}`;
    ctx.fillStyle = SUB;
    ctx.fillText('No plaques.', M, y);
    y += 28;
  } else {
    let bx = M;
    for (const [nm, v] of certs) {
      ctx.font = `18px ${ANTON}`;
      const label = `★ ${v}× ${nm}`;
      const bw = ctx.measureText(label).width + 26;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 1.5, y - 18.5, bw - 3, 30);
      chromeText(ctx, label, bx + 13, y + 3, 18, 0.6);
      bx += bw + 12;
      y += bx > W - M - 140 ? 40 : 0;
      if (bx > W - M - 140) bx = M;
    }
    y += 34;
  }

  y += 6;
  rule(ctx, M, y, W - M, 3, DEAD);

  // ---- credits
  y += 32;
  ctx.font = `700 12px ${MONO}`;
  ctx.fillStyle = SUB;
  tracking(ctx, 'SELECTED CREDITS', M, y, 3);
  y += 26;
  const tops = topPlacements(s.placements);
  if (!tops.length) {
    ctx.font = `400 18px ${COURIER}`;
    ctx.fillStyle = SUB;
    ctx.fillText('Nothing came out.', M, y);
    y += 28;
  } else {
    tops.forEach((p, i) => {
      ctx.font = `700 20px ${MONO}`;
      ctx.fillStyle = SUB;
      ctx.fillText(String(i + 1).padStart(2, '0'), M, y);
      ctx.font = `22px ${ANTON}`;
      ctx.fillStyle = INK;
      ctx.fillText(p.artist.toUpperCase(), M + 44, y);
      ctx.font = `700 12px ${MONO}`;
      ctx.fillStyle = SUB;
      const meta = `${p.underground ? 'UNDERGROUND' : `TIER ${p.tier}`} · AGE ${p.age}`;
      ctx.fillText(meta, W - M - ctx.measureText(meta).width, y);
      y += 32;
    });
  }

  y += 8;
  rule(ctx, M, y, W - M, 3, DEAD);

  // ---- the three lines
  y += 32;
  ctx.font = `700 12px ${MONO}`;
  ctx.fillStyle = SUB;
  tracking(ctx, 'FROM THE DIARY', M, y, 3);
  y += 30;
  for (const d of turningPoints(s.diary)) {
    ctx.font = `700 13px ${MONO}`;
    ctx.fillStyle = SIGNAL;
    ctx.fillText(`AGE ${d.age}`, M, y);
    y += 24;
    ctx.fillStyle = INK;
    ctx.font = `400 19px ${COURIER}`;
    y = wrap(ctx, d.text, M, y, RW, 27) + 16;
  }

  const contentEnd = y;

  // ---- footer: ending + score + bling
  const footY = H - 108;
  rule(ctx, M, footY - 56, W - M);

  star(ctx, M + 22, footY - 8, 22, -8);

  ctx.font = `30px ${ANTON}`;
  ctx.fillStyle = INK;
  ctx.fillText(STANDING, M + 58, footY);

  ctx.font = `700 15px ${MONO}`;
  ctx.fillStyle = SIGNAL;
  const pts = `${s.score.toLocaleString()} PTS`;
  ctx.fillText(pts, W - M - ctx.measureText(pts).width, footY);

  ctx.font = `400 12px ${MONO}`;
  ctx.fillStyle = SUB;
  ctx.fillText(
    `OVERALL ${overallRating(s)} · ${ratingTier(overallRating(s))}`,
    M + 58, footY + 26
  );

  markerText(ctx, 'demo tape', W - M - 150, footY + 44, 30, '#fff', INK, -4);

  return contentEnd;
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
