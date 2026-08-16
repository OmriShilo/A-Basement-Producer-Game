/** Diagnostic: when does a strong run actually reach each tier? */
import { createRun, setFocus, resolveTurn, advance, emptyCabinet } from '../src/engine/game.js';

const N = 1500;
const firstReach = {}; // tier -> array of turn indexes
const peakRel = [];
const peakTaste = [];
let legendWindow = 0, tier6Any = 0;

for (let i = 0; i < N; i++) {
  const s = createRun(emptyCabinet(), `peak-${i}`);
  const seen = {};
  let pr = 0, pt = 0;
  while (s.phase !== 'end') {
    // close whichever ladder requirement is currently binding
    let f;
    if (s.turn % 5 === 4) f = 'LIFE';
    else if (s.cash < 0) f = 'MONEY';
    else if (s.status < 3) f = s.skill < 40 ? 'CRAFT' : s.relevance < 25 ? 'HUSTLE' : 'CRAFT';
    else if (s.status < 4) f = s.relevance < 45 ? 'HUSTLE' : 'CRAFT';
    else if (s.status < 5) f = s.taste < 50 ? 'CRAFT' : 'HUSTLE';
    else if (s.status < 6) f = s.taste < 75 ? 'CRAFT' : 'HUSTLE';
    else f = 'LIFE';
    setFocus(s, s.forcedFocus || f);
    if (s.card) {
      const fx = s.card.accept.fx;
      const good = typeof fx === 'function' || fx.placement || (fx.taste || 0) > 0 || (fx.relevance || 0) > 0;
      resolveTurn(s, good ? 'accept' : 'pass');
    } else resolveTurn(s, 'none');
    pr = Math.max(pr, s.relevance);
    pt = Math.max(pt, s.taste);
    // the exact THE LEGEND window: tier 6, still standing, still turns left
    if (s.status >= 6 && s.turn < 11) legendWindow++;
    if (s.status >= 6) tier6Any++;
    if (!seen[s.status]) {
      seen[s.status] = true;
      (firstReach[s.status] = firstReach[s.status] || []).push(s.turn);
    }
    advance(s);
  }
  peakRel.push(pr);
  peakTaste.push(pt);
}

const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '—');
const p90 = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.9)];

console.log(`\n${N} strong runs\n`);
for (let t = 2; t <= 6; t++) {
  const arr = firstReach[t] || [];
  console.log(`  tier ${t}: reached in ${((arr.length / N) * 100).toFixed(1)}% of runs, first at avg turn ${avg(arr)} (of 12)`);
}
console.log(`\n  peak relevance: avg ${avg(peakRel)}, p90 ${p90(peakRel)}`);
console.log(`  tier-6 turn-instances: ${tier6Any}, of which usable LEGEND windows: ${legendWindow}`);
console.log(`  peak taste:     avg ${avg(peakTaste)}, p90 ${p90(peakTaste)}\n`);
