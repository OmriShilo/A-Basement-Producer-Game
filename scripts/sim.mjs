/**
 * Headless balance harness. `node scripts/sim.mjs [runs]`
 *
 * Plays a spread of archetype strategies and reports the distribution of
 * status tiers, awards, and plaques. Run it before touching any number in
 * game.js — the goal is that no status tier is unreachable and no tier is
 * the default.
 */
import { createRun, setFocus, resolveTurn, advance, retire, emptyCabinet } from '../src/engine/game.js';
import { CARDS } from '../src/content/cards.js';
import { STATUS } from '../src/engine/status.js';

const N = Number(process.argv[2] || 4000);

function rand(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** focus(s) · accept(s, card) · stop(s) */
const STRATEGIES = {
  balanced: {
    focus: (s) => (s.turn % 4 === 3 ? 'LIFE' : ['CRAFT', 'HUSTLE', 'CRAFT', 'HUSTLE', 'MONEY'][s.turn % 5]),
    accept: (s, c, i) => rand(i * 13 + s.turn) < 0.6,
    stop: () => false,
  },
  climber: {
    // plays toward the ladder: shore up whichever requirement is furthest behind
    focus: (s) => {
      if (s.turn % 4 === 3) return 'LIFE';
      if (s.cash < 0) return 'MONEY';
      if (s.turn < 3) return 'CRAFT';
      if (s.skill < 45) return 'CRAFT';
      if (s.taste < s.relevance - 15) return 'CRAFT';
      return 'HUSTLE';
    },
    accept: (s, c) => !!(c.accept.fx && (typeof c.accept.fx === 'function' || c.accept.fx.placement || c.accept.fx.relevance > 0)),
    stop: () => false,
  },
  purist: {
    focus: (s) => (s.turn % 4 === 3 ? 'LIFE' : s.cash < 0 ? 'MONEY' : 'CRAFT'),
    accept: (s, c) => !!(c.accept.fx && typeof c.accept.fx !== 'function' && (c.accept.fx.taste || 0) >= 0),
    stop: () => false,
  },
  undergrounder: {
    focus: (s) => (s.turn % 4 === 3 ? 'LIFE' : s.cash < 0 ? 'MONEY' : 'CRAFT'),
    accept: (s, c) => c.id.includes('underground') || (typeof c.accept.fx !== 'function' && (c.accept.fx.taste || 0) > 3),
    stop: () => false,
  },
  // proves THE LEGEND is reachable: climbs, then actually stops at the top
  legendhunter: {
    focus: (s) => {
      if (s.turn % 5 === 4) return 'LIFE';
      if (s.cash < 0) return 'MONEY';
      if (s.status < 3) return s.skill < 40 ? 'CRAFT' : s.relevance < 25 ? 'HUSTLE' : 'CRAFT';
      if (s.status < 4) return s.relevance < 45 ? 'HUSTLE' : 'CRAFT';
      if (s.status < 5) return s.taste < 50 ? 'CRAFT' : 'HUSTLE';
      if (s.status < 6) return s.taste < 75 ? 'CRAFT' : 'HUSTLE';
      return 'LIFE';
    },
    accept: (s, c) => !!(c.accept.fx && (typeof c.accept.fx === 'function' || c.accept.fx.placement || (c.accept.fx.taste || 0) > 0 || (c.accept.fx.relevance || 0) > 0)),
    stop: (s) => s.status >= 6,
  },
  chaser: {
    focus: (s) => (s.turn % 5 === 0 ? 'LIFE' : 'HUSTLE'),
    accept: (s, c, i) => rand(i * 5 + s.turn) < 0.75,
    stop: () => false,
  },
  moneyman: {
    focus: (s) => (s.turn % 4 === 3 ? 'LIFE' : 'MONEY'),
    accept: (s, c) => typeof c.accept.fx === 'function' || (c.accept.fx.cash || 0) > 0,
    stop: () => false,
  },
  quitter: {
    focus: (s) => (s.turn < 2 ? 'CRAFT' : 'MONEY'),
    accept: (s, c, i) => rand(i * 3 + s.turn) < 0.5,
    stop: (s, i) => s.turn >= 2 + Math.floor(rand(i) * 6),
  },
  earlyout: {
    focus: (s) => (s.turn % 4 === 3 ? 'LIFE' : s.turn % 2 ? 'HUSTLE' : 'CRAFT'),
    accept: (s, c, i) => rand(i * 11 + s.turn) < 0.65,
    stop: (s, i) => s.turn >= 6 + Math.floor(rand(i * 2) * 5),
  },
};

const names = Object.keys(STRATEGIES);
const statuses = {};
const byStrategy = {};
const whaleSeen = {};
const cardSeen = {};
let architects = 0, diamonds = 0, oscars = 0, emmys = 0, grammyW = 0, grammyN = 0;
let totalCash = 0, negEnd = 0;
const errors = [];

for (let i = 0; i < N; i++) {
  const stratName = names[i % names.length];
  const strat = STRATEGIES[stratName];
  const s = createRun(emptyCabinet(), `sim-${i}`);
  try {
    while (s.phase !== 'end') {
      if (strat.stop(s, i)) { retire(s, true); break; }
      setFocus(s, s.forcedFocus || strat.focus(s));
      if (s.card) {
        cardSeen[s.card.id] = (cardSeen[s.card.id] || 0) + 1;
        if (s.card.cls === 'WHALE') whaleSeen[s.card.id] = (whaleSeen[s.card.id] || 0) + 1;
        resolveTurn(s, strat.accept(s, s.card, i) ? 'accept' : 'pass');
      } else resolveTurn(s, 'none');
      advance(s);
    }
  } catch (e) {
    errors.push(`sim-${i}/${stratName}: ${e.message}`);
    continue;
  }
  statuses[s.status] = (statuses[s.status] || 0) + 1;
  byStrategy[stratName] = byStrategy[stratName] || {};
  byStrategy[stratName][s.status] = (byStrategy[stratName][s.status] || 0) + 1;
  if (s.snapshot.architect) architects++;
  diamonds += s.certs.diamond;
  oscars += s.awards.oscarWins;
  emmys += s.awards.emmyWins;
  grammyW += s.awards.grammyWins;
  grammyN += s.awards.grammyNoms;
  totalCash += s.cash;
  if (s.cash < 0) negEnd++;
}

const pct = (n, d = N) => `${((n / d) * 100).toFixed(1)}%`;

console.log(`\n${N} runs across ${names.length} strategies\n`);
if (errors.length) {
  console.log(`ERRORS (${errors.length}):\n${errors.slice(0, 5).join('\n')}\n`);
}

console.log('FINAL STATUS');
for (let i = 1; i <= 6; i++) {
  console.log(`     ${STATUS[i].name.padEnd(24)} ${String(statuses[i] || 0).padStart(5)}  ${pct(statuses[i] || 0)}`);
}

console.log('\nPEAK STATUS BY STRATEGY');
for (const n of names) {
  const b = byStrategy[n] || {};
  const total = Object.values(b).reduce((a, c) => a + c, 0) || 1;
  const best = Math.max(...Object.keys(b).map(Number), 0);
  console.log(`     ${n.padEnd(14)} best ${STATUS[best] ? STATUS[best].name : '—'} · avg tier ${(Object.entries(b).reduce((a, [k, v]) => a + k * v, 0) / total).toFixed(2)}`);
}

console.log('\nRARITIES');
console.log(`     Architect route          ${pct(architects)}`);
console.log(`     Diamond plaques          ${diamonds} total (1 per ${(N / Math.max(1, diamonds)).toFixed(0)} runs)`);
console.log(`     Grammy wins / noms       ${grammyW} / ${grammyN}`);
console.log(`     Oscar wins               ${oscars}`);
console.log(`     Emmy wins                ${emmys}`);
console.log(`     Avg ending cash          $${Math.round(totalCash / N).toLocaleString()}`);
console.log(`     Ended in the red         ${pct(negEnd)}`);

console.log('\nWHITE WHALES SEEN');
for (const c of CARDS.filter((x) => x.cls === 'WHALE')) {
  const n = whaleSeen[c.id] || 0;
  console.log(`  ${n === 0 ? '!!' : '  '} ${c.title.padEnd(28)} ${pct(n)}`);
}

const never = CARDS.filter((c) => !cardSeen[c.id]);
console.log(`\nCARDS NEVER DRAWN (${never.length}/${CARDS.length})`);
never.forEach((c) => console.log(`     ${c.cls.padEnd(9)} ${c.title}`));
console.log('');
