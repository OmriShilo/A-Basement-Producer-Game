import { CARDS } from '../content/cards.js';
import { ROSTER, TIER_KEY_BY_LEVEL, TERRITORY_UNLOCK, TERRITORY_NAME, makeLocalName, NAME_TO_CHART } from '../content/roster.js';
import { writeDiaryLine, fill, RETIREMENT_LINES, bandOf } from '../content/diary.js';
import { computeStatus, isArchitect } from './status.js';
import { hashSeed, mulberry32, weightedPick, newSeed } from './rng.js';

/* ------------------------------------------------------------------ */
/* THE CLOCK — turns get longer, so the years visibly accelerate       */
/* ------------------------------------------------------------------ */

export const TURNS = [
  { age: 14, span: 2 }, { age: 16, span: 2 }, { age: 18, span: 2 }, { age: 20, span: 2 },
  { age: 22, span: 3 }, { age: 25, span: 3 }, { age: 28, span: 3 }, { age: 31, span: 3 },
  { age: 34, span: 4 }, { age: 38, span: 4 }, { age: 42, span: 4 }, { age: 46, span: 4 },
];
export const END_AGE = 50;
export const DECAY_START_TURN = 8; // age 34

// `costs` is band-aware: relevance does not drain before 22, and saying it
// does would be a lie the player can check.
// `level` (1–5) drives the tracklist level meters: how hard this focus moves
// the needle in this band. `costs` is band-aware because relevance does not
// drain before 22, and saying it does would be a lie the player can check.
export const FOCUSES = {
  CRAFT: {
    name: 'CRAFT', blurb: 'Production, mixing, songwriting.', gives: '+Skill +Taste',
    costs: { young: 'Costs you nothing yet', peak: '−Relevance', late: '−Relevance' },
    level: { young: 5, peak: 4, late: 3 },
  },
  HUSTLE: {
    name: 'HUSTLE', blurb: 'Posting, networking, showing up.', gives: '+Relevance +Connections',
    costs: { young: 'Costs you nothing yet', peak: 'Costs you nothing yet', late: '−Taste' },
    level: { young: 4, peak: 5, late: 3 },
  },
  MONEY: {
    name: 'MONEY', blurb: 'Day job, commercial work, service beats.', gives: '+Cash',
    costs: { young: '−Taste', peak: '−Taste −Relevance', late: '−Taste −Relevance' },
    level: { young: 2, peak: 4, late: 5 },
  },
  LIFE: {
    name: 'LIFE', blurb: 'Rest, relationships, health.', gives: '+Taste +Connections',
    costs: { young: 'Costs you nothing yet', peak: '−Relevance −Cash', late: '−Relevance −Cash' },
    level: { young: 3, peak: 4, late: 5 },
  },
};

const FOCUS_FX = {
  // Relevance does not drain in the young band — at 16 nobody knows you
  // either way. The drain starts in your twenties and bites in your forties.
  // Taste is deliberately the slowest-moving number in the game.
  CRAFT: {
    young: { skill: 11, taste: 7, relevance: 0 },
    peak: { skill: 8, taste: 6, relevance: -1 },
    late: { skill: 5, taste: 5, relevance: -3 },
  },
  HUSTLE: {
    young: { relevance: 12, connections: 10, skill: 2 },
    peak: { relevance: 16, connections: 12, skill: 1 },
    late: { relevance: 11, connections: 8, taste: -1 },
  },
  MONEY: {
    young: (s) => ({ cash: 7000 + 40 * s.skill, skill: 3, taste: -3, relevance: 0 }),
    peak: (s) => ({ cash: 40000 + 800 * s.skill + 250 * s.connections, skill: 2, taste: -4, relevance: -2 }),
    late: (s) => ({ cash: 55000 + 1100 * s.skill + 400 * s.connections, taste: -4, relevance: -4 }),
  },
  LIFE: {
    young: { taste: 5, connections: 4, skill: 1, relevance: 0 },
    peak: { taste: 5, connections: 5, relevance: -2, cash: -6000 },
    late: { taste: 5, connections: 5, relevance: -4, cash: -4000 },
  },
};

const LIVING_COST = [0, 900, 3200, 7000, 34000, 34000, 34000, 34000, 56000, 56000, 56000, 56000];
const ROYALTY_BASE = { 1: 0, 2: 1200, 3: 12000, 4: 55000, 5: 200000 };

const GRAMMY_CATEGORIES = [
  'Producer of the Year, Non-Classical',
  'Album of the Year',
  'Record of the Year',
  'Best Rap Album',
  'Best Pop Vocal Album',
  'Best Dance/Electronic Album',
];

const UNCREDITED_NAME = 'an uncredited session';

// Every name that lives in the roster — used to tell a "real" artist credit
// apart from an uncredited session or a card's own self-credit string.
const ROSTER_ARTIST_NAMES = new Set(
  Object.values(ROSTER).flat().map((a) => a.name)
);

const LOYAL_PRODUCER_MIN = 6;
const LOYAL_PRODUCER_MAX = 8;

/* ------------------------------------------------------------------ */

export function emptyCabinet() {
  return {
    version: 1,
    runs: 0,
    retirementAges: [],
    longestCareer: 0,
    highestStatus: 0,
    grammyWins: 0, grammyNoms: 0,
    oscarWins: 0, oscarNoms: 0,
    emmyWins: 0, emmyNoms: 0,
    certs: { gold: 0, platinum: 0, multi: 0, diamond: 0 },
    chartsLanded: [],   // Billboard chart categories ever placed in — one "#1 Producer" trophy each
    whalesSeen: [],     // whale ids ever drawn
    whalesTaken: [],    // whale ids ever accepted — retired from the deck
    whalesPassed: [],
    artistsPlaced: [],  // roster artist names ever placed with, across all runs
    loyalProducer: [],  // artist names that hit the loyal-producer threshold in a single run
  };
}

/** `seed` is optional and internal — the sim harness passes one, players never do. */
export function createRun(cabinet, seed = newSeed()) {
  return {
    seed,
    cabinet,
    turn: 0,
    age: TURNS[0].age,
    skill: 8, taste: 12, relevance: 0, connections: 2,
    cash: 0,
    publishing: 100,
    royaltyMult: 1,
    placements: [],
    maxPlacementTier: 0,
    undergroundCount: 0,
    flags: new Set(),
    usedCards: new Set(),
    usedArtists: new Set(),
    diary: [],
    awards: { grammyNoms: 0, grammyWins: 0, oscarNoms: 0, oscarWins: 0, emmyNoms: 0, emmyWins: 0, list: [] },
    certs: { gold: 0, platinum: 0, multi: 0, diamond: 0 },
    pendingCerts: [],
    status: 1,
    maxStatus: 1,
    brokeStreak: 0,
    managerHonest: null,
    phase: 'focus',
    forcedFocus: null,
    focus: null,
    card: null,
    cast: null,
    report: null,
    whalesSeenThisRun: [],
  };
}

/* ------------------------------------------------------------------ */
/* EFFECTS                                                             */
/* ------------------------------------------------------------------ */

const CLAMPED = ['skill', 'taste', 'relevance', 'connections'];

function applyFx(s, fxIn, opts = {}) {
  const fx = typeof fxIn === 'function' ? fxIn(s) : fxIn;
  if (!fx) return [];
  const events = [];

  for (const k of [...CLAMPED, 'cash']) {
    if (fx[k] === undefined) continue;
    const v = fx[k];
    s[k] = k === 'cash' ? Math.round(s[k] + v) : clamp(s[k] + v);
  }
  if (fx.publishing !== undefined) s.publishing = Math.max(0, Math.min(100, s.publishing + fx.publishing));
  if (fx.royaltyMult !== undefined) s.royaltyMult = fx.royaltyMult === 0 ? 0 : s.royaltyMult * fx.royaltyMult;
  if (fx.flags) fx.flags.forEach((f) => s.flags.add(f));
  if (fx.clearFlags) fx.clearFlags.forEach((f) => s.flags.delete(f));

  if (fx.placement) {
    // Cards with no cast (your own record, a series, a sample clearance)
    // name their own credit rather than borrowing a roster artist.
    const artist = s.cast || { name: UNCREDITED_NAME, region: 'US' };
    const p = {
      tier: fx.placement.tier,
      artist: fx.placement.credit || artist.name,
      region: fx.placement.credit ? 'US' : artist.region || 'US',
      age: s.age,
      turn: s.turn,
      underground: !!fx.underground,
      score: !!fx.score,
      tv: !!fx.tv,
    };
    s.placements.push(p);
    if (!p.underground) s.maxPlacementTier = Math.max(s.maxPlacementTier, p.tier);
    if (p.underground) s.undergroundCount += 1;
    if (p.region !== 'US') {
      s.relevance = clamp(s.relevance + 4);
      events.push({ kind: 'territory', text: `Reach outside ${TERRITORY_NAME.US} — ${TERRITORY_NAME[p.region]}. +4 Relevance.` });
    }
    events.push({ kind: 'placement', placement: p });
  }
  return events;
}

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/* ------------------------------------------------------------------ */
/* CASTING & DECK                                                      */
/* ------------------------------------------------------------------ */

function territoryOpen(s, region) {
  return (TERRITORY_UNLOCK[region] || 9) <= s.status;
}

function poolFor(s, cast) {
  if (!cast) return null;
  if (cast.track === 'underground') return ROSTER.underground_us;
  if (cast.track === 'director') return ROSTER.directors;
  const key = TIER_KEY_BY_LEVEL[cast.tier];
  let pool = ROSTER[key] || [];
  if (cast.region) pool = pool.filter((a) => a.region === cast.region);
  else pool = pool.filter((a) => territoryOpen(s, a.region));
  return pool;
}

function castFor(s, card, rand) {
  const pool = poolFor(s, card.cast);
  if (!pool) return null;
  const fresh = pool.filter((a) => !s.usedArtists.has(a.name));
  const use = fresh.length ? fresh : pool;
  if (!use.length) return makeLocalName(rand);
  return use[Math.floor(rand() * use.length)];
}

function meets(s, card) {
  const r = card.req || {};
  const check = (val, req) => {
    if (req === undefined) return true;
    if (Array.isArray(req)) return val >= req[0] && val <= req[1];
    return val >= req;
  };
  if (!check(s.skill, r.skill)) return false;
  if (!check(s.taste, r.taste)) return false;
  if (!check(s.relevance, r.relevance)) return false;
  if (!check(s.connections, r.connections)) return false;
  if (!check(s.cash, r.cash)) return false;
  if (!check(s.age, r.age)) return false;
  if (!check(s.status, r.status)) return false;
  if (r.flags && !r.flags.every((f) => s.flags.has(f))) return false;
  if (r.not && r.not.some((f) => s.flags.has(f))) return false;
  if (card.cast) {
    const pool = poolFor(s, card.cast);
    if (!pool || !pool.length) return false;
  }
  return true;
}

function drawCard(s, rand) {
  const eligible = CARDS.filter((c) => {
    if (s.usedCards.has(c.id)) return false;
    if (c.cls === 'WHALE' && s.cabinet.whalesTaken.includes(c.id)) return false; // once per account
    return meets(s, c);
  });
  if (!eligible.length) return null;

  // A promised payoff (the manager audit) never waits on a die roll.
  const forced = eligible.find((c) => (c.weight || 1) >= 9);
  if (forced) return forced;

  const byClass = { WHALE: [], RARE: [], CONTRACT: [], COMMON: [] };
  eligible.forEach((c) => byClass[c.cls].push(c));
  const classWeights = { WHALE: 26, RARE: 24, CONTRACT: 20, COMMON: 40 };
  const options = Object.keys(byClass)
    .filter((k) => byClass[k].length)
    .map((k) => ({ k, weight: classWeights[k] }));
  const chosen = weightedPick(options, rand).k;
  return weightedPick(byClass[chosen], rand, (c) => c.weight || 1);
}

/* ------------------------------------------------------------------ */
/* TURN FLOW                                                           */
/* ------------------------------------------------------------------ */

function turnRand(s, salt) {
  return mulberry32(hashSeed(`${s.seed}|${s.turn}|${salt}`));
}

export function setFocus(s, focus) {
  s.focus = focus;
  const rand = turnRand(s, 'deck');
  const card = drawCard(s, rand);
  s.card = card;
  s.cast = card ? castFor(s, card, rand) : null;
  if (card && card.cls === 'WHALE') {
    s.whalesSeenThisRun.push(card.id);
  }
  s.phase = 'card';
  return s;
}

export function resolveTurn(s, choice) {
  const rand = turnRand(s, 'resolve');
  const before = snapshotStats(s);
  const statusFrom = s.status;
  const band = bandOf(s.age);
  const events = [];
  const hadPlacementsBefore = s.placements.length;

  // 1. focus
  events.push(...applyFx(s, FOCUS_FX[s.focus][band]));

  // 2. the card
  let cardLine = null;
  if (s.card && choice !== 'none') {
    const branch = choice === 'accept' ? s.card.accept : s.card.pass;
    s.usedCards.add(s.card.id);
    if (s.cast) s.usedArtists.add(s.cast.name);
    events.push(...applyFx(s, branch.fx));
    if (branch.diary) cardLine = fill(branch.diary, { artist: s.cast ? s.cast.name : 'them', age: s.age });
    if (s.card.cls === 'WHALE') {
      const list = choice === 'accept' ? 'whalesTaken' : 'whalesPassed';
      if (!s.cabinet[list].includes(s.card.id)) s.cabinet[list].push(s.card.id);
      if (!s.cabinet.whalesSeen.includes(s.card.id)) s.cabinet.whalesSeen.push(s.card.id);
    }
    if (choice === 'accept' && s.flags.has('manager_pending') && s.managerHonest === null) {
      s.managerHonest = rand() < 0.55; // rolled at signing, revealed in six years
    }
  }

  // 3. royalties from earlier placements
  const income = royaltyIncome(s);
  s.cash += income;

  // 4. the cost of being alive
  const costs = LIVING_COST[s.turn];
  s.cash -= costs;

  // 5. relevance decay — after 34 the world starts taking it back
  let decay = 0;
  if (s.turn >= DECAY_START_TURN) {
    const madeSomething = s.placements.some((p) => p.turn === s.turn);
    decay = madeSomething ? 4 : 7;
    s.relevance = clamp(s.relevance - decay);
  }

  // 6. certifications land one to two turns after the placement
  const certEvents = resolveCertifications(s, rand);

  // 7. queue certifications for anything made this turn
  s.placements
    .filter((p) => p.turn === s.turn && p.tier >= 2 && !p.underground && !p.certQueued)
    .forEach((p) => {
      p.certQueued = true;
      s.pendingCerts.push({ tier: p.tier, artist: p.artist, resolveTurn: s.turn + (rand() < 0.5 ? 1 : 2) });
    });

  // 8. awards
  const awardEvents = resolveAwards(s, rand);

  // 9. the manager reveal, six years on
  if (s.flags.has('manager_pending')) {
    if (!s.managerRevealTurn) s.managerRevealTurn = s.turn + 2;
    else if (s.turn >= s.managerRevealTurn) {
      s.flags.delete('manager_pending');
      s.flags.add(s.managerHonest ? 'manager_reveal_good' : 'manager_reveal_bad');
    }
  }

  // 10. status
  s.status = cappedStatus(s);
  if (s.status > s.maxStatus) s.maxStatus = s.status;

  // 11. money trouble
  if (s.cash < 0) s.brokeStreak += 1;
  else s.brokeStreak = 0;

  // 12. the diary line
  let condition = null;
  if (s.cash < 0) condition = 'broke';
  else if (s.status < statusFrom) condition = 'demoted';
  else if (s.status > statusFrom) condition = 'promoted';
  else if (hadPlacementsBefore === 0 && s.placements.length > 0) condition = 'firstPlacement';
  const line = writeDiaryLine({ focus: s.focus, age: s.age, cardLine, condition }, turnRand(s, 'diary'));
  s.diary.push({ age: s.age, text: line.text, weight: line.weight });

  s.report = {
    age: s.age,
    span: TURNS[s.turn].span,
    focus: s.focus,
    card: s.card,
    cast: s.cast,
    choice,
    deltas: diffStats(before, snapshotStats(s)),
    diary: line.text,
    statusFrom,
    statusTo: s.status,
    income,
    costs,
    decay,
    events,
    certEvents,
    awardEvents,
  };
  s.phase = 'resolve';
  return s;
}

export function advance(s) {
  s.turn += 1;
  if (s.turn >= TURNS.length) return retire(s, false);
  s.age = TURNS[s.turn].age;
  s.focus = null;
  s.card = null;
  s.cast = null;
  s.forcedFocus = s.brokeStreak >= 2 ? 'MONEY' : null;
  s.phase = 'focus';
  return s;
}

function cappedStatus(s) {
  const st = computeStatus(s);
  return s.flags.has('ceiling_capped') ? Math.min(st, 5) : st;
}

function royaltyIncome(s) {
  let total = 0;
  for (const p of s.placements) {
    const since = s.turn - p.turn;
    if (since < 1) continue;
    let base = ROYALTY_BASE[p.tier] || 0;
    if (p.underground) base *= 0.03;
    if (p.score) base *= 1.25;
    total += base * Math.pow(0.62, since - 1);
  }
  total *= s.royaltyMult * (0.5 + s.publishing / 200);
  return Math.round(total);
}

function resolveCertifications(s, rand) {
  const out = [];
  const still = [];
  for (const q of s.pendingCerts) {
    if (q.resolveTurn > s.turn) { still.push(q); continue; }
    const boost = s.relevance / 500;
    const table = {
      2: { gold: 0.25 },
      3: { gold: 0.6, platinum: 0.2 },
      4: { gold: 0.85, platinum: 0.5, multi: 0.15 },
      5: { gold: 0.97, platinum: 0.8, multi: 0.4, diamond: 0.095 },
    }[q.tier] || {};
    const u = rand() - boost;
    let level = null;
    if (table.diamond !== undefined && u < table.diamond) level = 'diamond';
    else if (table.multi !== undefined && u < table.multi) level = 'multi';
    else if (table.platinum !== undefined && u < table.platinum) level = 'platinum';
    else if (table.gold !== undefined && u < table.gold) level = 'gold';
    if (level) {
      s.certs[level] += 1;
      s.relevance = clamp(s.relevance + { gold: 2, platinum: 4, multi: 7, diamond: 12 }[level]);
      out.push({ level, artist: q.artist, tier: q.tier });
    }
  }
  s.pendingCerts = still;
  return out;
}

function resolveAwards(s, rand) {
  const out = [];
  const thisTurn = s.placements.filter((p) => p.turn === s.turn);

  // A nomination is worth something on its own. A win moves the needle.
  const credit = (won) => {
    s.relevance = clamp(s.relevance + (won ? 6 : 2));
    if (won) s.taste = clamp(s.taste + 2);
  };

  for (const p of thisTurn) {
    // GRAMMY
    if (!p.underground && p.tier >= 3 && s.taste >= 60) {
      const noms = 1 + (p.tier >= 5 && s.taste >= 70 ? 1 : 0);
      for (let i = 0; i < noms; i++) {
        const cat = GRAMMY_CATEGORIES[Math.floor(rand() * GRAMMY_CATEGORIES.length)];
        s.awards.grammyNoms += 1;
        let win = 0.1 + s.taste / 400 + s.relevance / 500 + (p.tier - 3) * 0.08;
        if (s.flags.has('campaigning')) win += 0.12;
        if (s.flags.has('album_credit')) win += 0.05;
        const won = rand() < Math.min(0.7, win);
        if (won) s.awards.grammyWins += 1;
        credit(won);
        s.awards.list.push({ kind: 'GRAMMY', category: cat, age: s.age, won, artist: p.artist });
        out.push({ kind: 'GRAMMY', category: cat, won, artist: p.artist });
      }
    }
    // OSCAR — features only
    if (p.score && !p.tv && s.taste >= 70) {
      s.awards.oscarNoms += 1;
      const won = rand() < Math.min(0.6, 0.18 + (s.taste + s.skill - 140) / 300);
      if (won) s.awards.oscarWins += 1;
      credit(won);
      s.awards.list.push({ kind: 'OSCAR', category: 'Best Original Score', age: s.age, won, artist: p.artist });
      out.push({ kind: 'OSCAR', category: 'Best Original Score', won, artist: p.artist });
    }
    // EMMY — television
    if (p.tv && s.taste >= 55) {
      s.awards.emmyNoms += 1;
      const won = rand() < Math.min(0.6, 0.22 + s.taste / 300);
      if (won) s.awards.emmyWins += 1;
      credit(won);
      s.awards.list.push({ kind: 'EMMY', category: 'Outstanding Music Composition', age: s.age, won, artist: p.artist });
      out.push({ kind: 'EMMY', category: 'Outstanding Music Composition', won, artist: p.artist });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* RETIREMENT                                                          */
/* ------------------------------------------------------------------ */

export function retire(s, voluntary) {
  const age = voluntary ? s.age : END_AGE;
  const band = bandOf(age);
  const line = voluntary ? fill(RETIREMENT_LINES.voluntary[band], { age }) : RETIREMENT_LINES.forced;
  s.diary.push({ age, text: line, weight: 2 });

  const snap = {
    age,
    years: age - 14,
    voluntary,
    status: s.status,
    maxStatus: s.maxStatus,
    skill: s.skill, taste: s.taste, relevance: s.relevance,
    connections: s.connections, cash: s.cash,
    flags: s.flags,
    placements: s.placements,
    maxPlacementTier: s.maxPlacementTier,
    undergroundCount: s.undergroundCount,
    awards: s.awards,
    certs: s.certs,
    architect: isArchitect(s),
  };

  // Loyal Producer — a randomized-per-run threshold (seeded, so deterministic
  // for this run) of placements with the same real roster artist in one run.
  const loyalRand = mulberry32(hashSeed(`${s.seed}|loyal`));
  const threshold = LOYAL_PRODUCER_MIN + Math.floor(loyalRand() * (LOYAL_PRODUCER_MAX - LOYAL_PRODUCER_MIN + 1));
  const counts = {};
  for (const p of s.placements) {
    if (!ROSTER_ARTIST_NAMES.has(p.artist)) continue;
    counts[p.artist] = (counts[p.artist] || 0) + 1;
  }
  s.loyalProducerThreshold = threshold;
  s.loyalProducerThisRun = Object.keys(counts).filter((name) => counts[name] > threshold);

  s.snapshot = snap;
  s.retiredAge = age;
  s.voluntary = voluntary;
  s.score = scoreRun(snap);
  s.phase = 'end';
  return s;
}

export function scoreRun(r) {
  let n = 0;
  n += r.status * 900;
  n += r.taste * 22 + r.skill * 14 + r.relevance * 16 + r.connections * 8;
  n += r.placements.reduce((a, p) => a + [0, 40, 180, 700, 2400, 8000][p.tier], 0);
  n += r.awards.grammyWins * 2500 + r.awards.grammyNoms * 600;
  n += r.awards.oscarWins * 4000 + r.awards.oscarNoms * 1000;
  n += r.awards.emmyWins * 2000 + r.awards.emmyNoms * 500;
  n += r.certs.gold * 300 + r.certs.platinum * 900 + r.certs.multi * 2200 + r.certs.diamond * 9000;
  n += Math.max(0, Math.round(r.cash / 4000));
  if (r.architect) n += 6000;
  if (r.voluntary) n += 1200;
  return Math.max(0, Math.round(n));
}

/* the three lines that make the career card */
export function turningPoints(diary) {
  return [...diary]
    .map((d, i) => ({ ...d, i }))
    .sort((a, b) => b.weight - a.weight || b.i - a.i)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i);
}

export function topPlacements(placements) {
  return [...placements].sort((a, b) => b.tier - a.tier || b.age - a.age).slice(0, 3);
}

/* ------------------------------------------------------------------ */

function snapshotStats(s) {
  return { skill: s.skill, taste: s.taste, relevance: s.relevance, connections: s.connections, cash: s.cash };
}

function diffStats(a, b) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = b[k] - a[k];
  return out;
}

export function mergeIntoCabinet(cabinet, s) {
  const c = { ...cabinet, certs: { ...cabinet.certs } };
  c.runs += 1;
  c.retirementAges = [...c.retirementAges, s.retiredAge];
  c.longestCareer = Math.max(c.longestCareer, s.retiredAge - 14);
  c.highestStatus = Math.max(c.highestStatus, s.status);
  c.grammyWins += s.awards.grammyWins;
  c.grammyNoms += s.awards.grammyNoms;
  c.oscarWins += s.awards.oscarWins;
  c.oscarNoms += s.awards.oscarNoms;
  c.emmyWins += s.awards.emmyWins;
  c.emmyNoms += s.awards.emmyNoms;
  for (const k of Object.keys(c.certs)) c.certs[k] += s.certs[k];

  const chartsThisRun = s.placements.map((p) => NAME_TO_CHART.get(p.artist)).filter(Boolean);
  c.chartsLanded = [...new Set([...(c.chartsLanded || []), ...chartsThisRun])];

  c.whalesSeen = [...new Set([...c.whalesSeen, ...s.whalesSeenThisRun])];
  c.whalesTaken = [...new Set(s.cabinet.whalesTaken)];
  c.whalesPassed = [...new Set(s.cabinet.whalesPassed)];

  const placedNames = s.placements.map((p) => p.artist).filter((n) => ROSTER_ARTIST_NAMES.has(n));
  c.artistsPlaced = [...new Set([...(c.artistsPlaced || []), ...placedNames])];

  const loyal = s.loyalProducerThisRun || [];
  c.loyalProducer = [...new Set([...(c.loyalProducer || []), ...loyal])];

  return c;
}

export function shareText(s) {
  const st = s.status;
  const a = s.awards;
  const cz = s.certs;
  const lines = [];
  lines.push('BASEMENT');
  lines.push(`14 → ${s.retiredAge} · ${['', 'BEDROOM', 'LOCAL', 'KNOWN', 'NATIONAL', 'INTERNATIONAL', 'LEGENDARY'][st]}`);
  const bits = [];
  if (a.grammyWins || a.grammyNoms) bits.push(`GRAMMY ${a.grammyWins}/${a.grammyNoms}`);
  if (a.oscarWins || a.oscarNoms) bits.push(`OSCAR ${a.oscarWins}/${a.oscarNoms}`);
  if (a.emmyWins || a.emmyNoms) bits.push(`EMMY ${a.emmyWins}/${a.emmyNoms}`);
  if (bits.length) lines.push(bits.join('  '));
  const plaques = [cz.gold && `${cz.gold}G`, cz.platinum && `${cz.platinum}P`, cz.multi && `${cz.multi}M`, cz.diamond && `${cz.diamond}D`].filter(Boolean);
  if (plaques.length) lines.push(`PLAQUES ${plaques.join(' ')}`);
  lines.push(`${s.score.toLocaleString()} pts`);
  return lines.join('\n');
}
