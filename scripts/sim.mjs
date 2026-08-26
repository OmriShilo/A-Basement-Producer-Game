/**
 * Headless balance harness. `node scripts/sim.mjs [runs]`
 *
 * One turn is one year. Each year deals two offers and the strategy takes one.
 * There are no tiers any more, so what matters is the spread of final OVR and
 * whether every card still reaches the table.
 */
import { createRun, beginYear, resolveYear, advance, retire, emptyCabinet, TURNS, offerIsRack, gambleChance } from '../src/engine/game.js';
import { CARDS } from '../src/content/cards.js';

/**
 * What a player actually gets out of a session at the rack.
 *
 * The engine cannot roll this — it is the one outcome decided by hand — so the
 * harness stands in three kinds of player. The mix matters more than the exact
 * numbers: if the rack only balances for someone who farms chords, it is a
 * trap for everyone else, and if it only balances for someone who noodles, it
 * is not worth building.
 */
const RACK_PLAYERS = {
  idle:     { chords: [0, 2], insts: 1 },   // clicked around, left
  ordinary: { chords: [3, 7], insts: 3 },   // played properly for a bit
  digger:   { chords: [9, 16], insts: 5 },  // went looking for chords
};
const RACK_MIX = ['idle', 'ordinary', 'ordinary', 'digger'];
function rackSession(i, t) {
  const p = RACK_PLAYERS[RACK_MIX[(i + t) % RACK_MIX.length]];
  const [lo, hi] = p.chords;
  return {
    chordsFound: lo + Math.floor(rnd(i * 7 + t * 3) * (hi - lo + 1)),
    instrumentsPlayed: p.insts,
    notesPlayed: 0,
  };
}

const N = Number(process.argv[2] || 4000);
const rnd = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

/* Cards whose payoff depends on who they cast declare `fx` as a function, so
   it has to be resolved against the offer before it can be compared — reading
   `.rating` straight off a function yields undefined, which scored every such
   card as worthless and made the greedy strategy systematically pass on the
   biggest card in the deck. Gambles are valued at their expected return. */
const fxOf = (o) => {
  const fx = o.card.accept.fx;
  return typeof fx === 'function' ? fx({ cast: o.cast }) : fx;
};
const worth = (fx) => (fx.rating || 0) + (fx.ratingJump || 0) + ((fx.placement || {}).tier || 0) * 2;
const best = (o) => {
  const chance = gambleChance(o.card, o.cast);
  return worth(fxOf(o)) * (chance === null ? 1 : chance);
};

const STRATEGIES = {
  greedy:   (offers) => (best(offers[0]) >= best(offers[1] || offers[0]) ? 0 : 1),
  credits:  (offers) => {
    const i = offers.findIndex((o) => fxOf(o).placement);
    return i >= 0 ? i : 0;
  },
  coinflip: (offers, i, t) => (rnd(i * 13 + t) < 0.5 ? 0 : 1),
  first:    () => 0,
  second:   (offers) => (offers.length > 1 ? 1 : 0),
};
const RETIRE_AT = { greedy: 99, credits: 99, coinflip: 99, first: 99, second: 34 };

const names = Object.keys(STRATEGIES);
const cardSeen = {};
const finals = [];
let diamonds = 0, grammyW = 0, grammyN = 0, oscars = 0, emmys = 0, architects = 0;
let prodigies = 0, plateaus = 0, emptyYears = 0, totalYears = 0;
let rackOffered = 0, rackTaken = 0;
let gambleOffered = 0, gambleTaken = 0, gambleWon = 0;
const jumpYears = [];
const rackVisitCounts = [];
const errors = [];

for (let i = 0; i < N; i++) {
  const name = names[i % names.length];
  const s = createRun(emptyCabinet(), `sim-${i}`);
  if (s.prodigy) prodigies++;
  try {
    beginYear(s);
    let t = 0;
    while (s.phase !== 'end' && t < TURNS.length + 2) {
      if (t >= RETIRE_AT[name]) { retire(s, true); break; }
      if (!s.offers.length) emptyYears++;
      s.offers.forEach((o) => { cardSeen[o.card.id] = (cardSeen[o.card.id] || 0) + 1; });
      const pick = s.offers.length ? STRATEGIES[name](s.offers, i, t) : -1;
      const isRack = pick >= 0 && offerIsRack(s.offers[pick]);
      if (s.offers.some(offerIsRack)) rackOffered++;
      if (isRack) rackTaken++;
      if (s.offers.some((o) => gambleChance(o.card, o.cast) !== null)) gambleOffered++;
      const tookGamble = pick >= 0 && gambleChance(s.offers[pick].card, s.offers[pick].cast) !== null;
      if (tookGamble) gambleTaken++;
      resolveYear(s, pick, isRack ? { rack: rackSession(i, t) } : {});
      if (s.report && s.report.gamble && s.report.gamble.won) gambleWon++;
      if (s.report && s.report.ratingJump > 0) jumpYears.push(s.report.ratingJump);
      advance(s); t++; totalYears++;
    }
  } catch (e) { errors.push(`sim-${i}/${name}: ${e.message}`); continue; }
  finals.push(s.rating);
  rackVisitCounts.push(s.rackVisits);
  if (s.plateaued) plateaus++;
  if (s.snapshot.architect) architects++;
  diamonds += s.certs.diamond;
  grammyW += s.awards.grammyWins; grammyN += s.awards.grammyNoms;
  oscars += s.awards.oscarWins; emmys += s.awards.emmyWins;
}

finals.sort((a, b) => a - b);
const q = (p) => finals[Math.floor(finals.length * p)];
const pct = (n, d = N) => `${((n / d) * 100).toFixed(1)}%`;

console.log(`\n${N} runs · ${TURNS.length} years each · ${names.length} strategies\n`);
if (errors.length) console.log(`ERRORS (${errors.length}):\n${errors.slice(0, 5).join('\n')}\n`);

console.log('FINAL OVERALL');
[['p10', .1], ['p25', .25], ['median', .5], ['p75', .75], ['p90', .9], ['p99', .99]]
  .forEach(([l, p]) => console.log(`     ${l.padEnd(8)} ${q(p)}`));
console.log(`     ${'max'.padEnd(8)} ${finals[finals.length - 1]}`);

console.log('\nTALENT');
console.log(`     Prodigies                ${pct(prodigies)}`);
console.log(`     …who levelled off        ${pct(plateaus, Math.max(1, prodigies))}`);

console.log('\nRARITIES');
console.log(`     Architect route          ${pct(architects)}`);
console.log(`     Diamond plaques          ${diamonds} total (1 per ${(N / Math.max(1, diamonds)).toFixed(0)} runs)`);
console.log(`     Grammy wins / noms       ${grammyW} / ${grammyN}`);
console.log(`     Oscar / Emmy wins        ${oscars} / ${emmys}`);
console.log(`     Years with no offer      ${((emptyYears / totalYears) * 100).toFixed(2)}%`);

console.log('\nTHE RACK');
console.log(`     Years it was offered     ${((rackOffered / totalYears) * 100).toFixed(1)}%`);
console.log(`     Years it was taken       ${((rackTaken / totalYears) * 100).toFixed(1)}%`);
console.log(`     Visits per run (avg)     ${(rackVisitCounts.reduce((a, b) => a + b, 0) / Math.max(1, rackVisitCounts.length)).toFixed(1)}`);
console.log(`     Most in one run          ${Math.max(0, ...rackVisitCounts)}`);

console.log('\nGAMBLES');
console.log(`     Years one was offered    ${((gambleOffered / totalYears) * 100).toFixed(1)}%`);
console.log(`     Years one was taken      ${((gambleTaken / totalYears) * 100).toFixed(1)}%`);
console.log(`     …of those, won           ${((gambleWon / Math.max(1, gambleTaken)) * 100).toFixed(1)}%`);

jumpYears.sort((a, b) => a - b);
console.log('\nBIG JUMPS');
console.log(`     Jump years               ${jumpYears.length} (${(jumpYears.length / Math.max(1, N)).toFixed(2)} per run)`);
console.log(`     Biggest single jump      +${jumpYears.length ? jumpYears[jumpYears.length - 1] : 0}`);
console.log(`     Runs with a +7 or more   ${pct(jumpYears.filter((j) => j >= 7).length)}`);

const never = CARDS.filter((c) => !cardSeen[c.id]);
console.log(`\nCARDS NEVER OFFERED (${never.length}/${CARDS.length})`);
never.forEach((c) => console.log(`     ${c.cls.padEnd(9)} ${c.title}`));
console.log('');

/* Exit non-zero on anything that means the deck is BROKEN rather than merely
   badly balanced, so CI can gate a deploy on it. Balance is a judgement call
   and is left to a human reading the numbers above. A run that throws, a card
   that can never be drawn, or a year with nothing on the table are not
   judgement calls — they are bugs, and a card edit can introduce any of them
   without breaking the build. */
const problems = [];
if (errors.length) problems.push(`${errors.length} runs threw`);
if (never.length) problems.push(`${never.length} cards can never be drawn`);
if (emptyYears > 0) problems.push(`${emptyYears} years had no offer at all`);
if (problems.length) {
  console.error(`FAILED: ${problems.join('; ')}\n`);
  process.exit(1);
}
