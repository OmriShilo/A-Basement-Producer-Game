import { CARDS } from '../content/cards.js';
import { ROSTER, TIER_KEY_BY_LEVEL, TERRITORY_UNLOCK, TERRITORY_NAME, makeLocalName, NAME_TO_CHART } from '../content/roster.js';
import { writeDiaryLine, fill, RETIREMENT_LINES, bandOf } from '../content/diary.js';
import { STANDING, isArchitect } from './status.js';
// re-exported so the UI keeps a single import site
export { overallRating, ratingTier } from './rating.js';
import {
  rollTalent, applyRating,
  PRODIGY_AT, UNDERDOG_AT, PLATEAU_CHANCE, PLATEAU_FROM_TURN,
  FIRST_BIG_JUMP, CERT_JUMP, applyJump, rollPotential,
  applyTemp, settleTemp, shownRating,
} from './rating.js';
import { scoreRackVisit, rackOutcome } from './rack.js';
import { yearStreams } from './streams.js';
import { pickLabel, signLabel, tickLabel, labelArtistNames, LABEL_CAST_BIAS } from './labels.js';
import { LABEL_BY_ID } from '../content/labels.js';
import { hashSeed, mulberry32, weightedPick, newSeed } from './rng.js';

/* ------------------------------------------------------------------ */
/* THE CLOCK — one turn is one year                                    */
/* ------------------------------------------------------------------ */

export const START_AGE = 16;
export const END_AGE = 50;
/** The calendar year the career opens in — the log reads in real years. */
export const START_YEAR = 2015;

export const TURNS = Array.from(
  { length: END_AGE - START_AGE },
  (_, i) => ({ age: START_AGE + i, span: 1, year: START_YEAR + i }),
);

/** Age 34 — the point the years start taking things back. */
export const DECAY_START_TURN = 34 - START_AGE;

/**
 * How often each class of card reaches the table.
 *
 * These are keyed by card class because there are no lanes any more. The
 * previous shape was keyed by lane (ROOM / CIRCUIT / LONGSHOT) and outlived the
 * system that read it: pickOne looks up CLASS_WEIGHTS[cls], which found nothing
 * under the lane keys, so weightedPick fell back to its default weight of 1 and
 * every class was equally likely. RARE cards were being dealt at roughly twice
 * their intended rate.
 */
const CLASS_WEIGHTS = { COMMON: 52, CONTRACT: 24, RARE: 24 };

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
    bestRating: 0,
    grammyWins: 0, grammyNoms: 0,
    oscarWins: 0, oscarNoms: 0,
    emmyWins: 0, emmyNoms: 0,
    certs: { gold: 0, platinum: 0, multi: 0, diamond: 0 },
    chartsLanded: [],   // Billboard chart categories ever placed in — one "#1 Producer" trophy each
    artistsPlaced: [],  // roster artist names ever placed with, across all runs
    loyalProducer: [],  // artist names that hit the loyal-producer threshold in a single run
  };
}

/** `seed` is optional and internal — the sim harness passes one, players never do. */
export function createRun(cabinet, seed = newSeed()) {
  // THE TALENT ROLL — the one thing decided before you play a note.
  const talent = rollTalent(mulberry32(hashSeed(`${seed}|talent`)));
  const prodigy = talent >= PRODIGY_AT;
  // The ceiling for this run. Rolled here, never shown, and the single thing
  // that decides whether this career plateaus at 74 or at 93.
  const potential = rollPotential(talent, prodigy, mulberry32(hashSeed(`${seed}|potential`)));
  const flags = new Set();
  if (talent <= UNDERDOG_AT) flags.add('underdog');
  return {
    seed,
    cabinet,
    turn: 0,
    age: TURNS[0].age,
    talent,
    potential,
    rating: talent,
    temp: 0,               // FORM — temporary overall, see engine/rating.js
    prodigy,
    plateaued: false,
    plateauedAt: null,
    placements: [],
    firstBigDone: false,   // the first tier-3+ credit pays a one-time jump
    firstBigTier: 0,
    heat: 0,               // years of elevated reach left after a big credit
    lastLabelSession: null,
    label: null,           // the current deal — see engine/labels.js
    labelHistory: [],      // every deal this run, for the end screen
    pendingRenewal: null,
    rackVisits: 0,     // drives the rack's diminishing return — see engine/rack.js
    maxPlacementTier: 0,
    undergroundCount: 0,
    flags,
    usedCards: new Set(),
    usedArtists: new Set(),
    diary: [],
    awards: { grammyNoms: 0, grammyWins: 0, oscarNoms: 0, oscarWins: 0, emmyNoms: 0, emmyWins: 0, list: [] },
    certs: { gold: 0, platinum: 0, multi: 0, diamond: 0 },
    pendingCerts: [],
    log: [],
    offers: [],
    managerHonest: null,
    phase: 'choose',
    card: null,
    cast: null,
    report: null,
  };
}

/* ------------------------------------------------------------------ */
/* EFFECTS                                                             */
/* ------------------------------------------------------------------ */

function applyFx(s, fxIn) {
  const fx = typeof fxIn === 'function' ? fxIn(s) : fxIn;
  if (!fx) return [];
  const events = [];

  if (fx.rating) events.push({ kind: 'rating', amount: fx.rating });
  if (fx.ratingJump) events.push({ kind: 'ratingJump', amount: fx.ratingJump });
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
      single: !!fx.placement.single,
      score: !!fx.score,
      tv: !!fx.tv,
    };
    s.placements.push(p);
    if (!p.underground) s.maxPlacementTier = Math.max(s.maxPlacementTier, p.tier);
    if (p.underground) s.undergroundCount += 1;

    // THE FIRST BIG ONE — paid once, as a jump, sized by how big it was.
    if (!p.underground && !s.firstBigDone && FIRST_BIG_JUMP[p.tier]) {
      s.firstBigDone = true;
      s.firstBigTier = p.tier;
      events.push({ kind: 'ratingJump', amount: FIRST_BIG_JUMP[p.tier] });
      events.push({ kind: 'firstBig', tier: p.tier, artist: p.artist });
    }
    // Any big credit — not just the first — keeps the phone ringing for a while.
    if (!p.underground && p.tier >= 3) s.heat = HEAT_YEARS;
    if (p.region !== 'US') {
      events.push({ kind: 'rating', amount: 2 });
      events.push({ kind: 'territory', text: `Reach outside ${TERRITORY_NAME.US} — ${TERRITORY_NAME[p.region]}. +2 Overall.` });
    }
    events.push({ kind: 'placement', placement: p });
  }
  return events;
}

/* ------------------------------------------------------------------ */
/* CASTING & DECK                                                      */
/* ------------------------------------------------------------------ */

function territoryOpen(s, region) {
  return (TERRITORY_UNLOCK[region] || 999) <= s.rating;
}

/**
 * THE OPEN DOOR — how often a room at each tier is the room you get into.
 *
 * A card cast as `{ track: 'any' }` can name anybody in the game, which is the
 * whole point of it: the studio invitation has to be able to be a kid from your
 * neighbourhood or the biggest artist alive, off the same card. These weights
 * are what makes the difference matter — a tier-1 room is eight times likelier
 * than a tier-5 one, so the year Travis Scott's name comes up is a year you
 * remember. Age still gates it through TIER_OPENS_AT: at sixteen the only door
 * open is tier 1, and the top of the roster cannot appear at all until 31.
 */
const ANY_TIER_WEIGHT = { 1: 40, 2: 26, 3: 18, 4: 11, 5: 5 };

/**
 * HOW FAR YOU CAN REACH — the room you can get into on your credits.
 *
 * A credit is a door. Land a tier-3 record and tier-4 rooms start returning
 * your calls; land a tier-4 and the top of the roster becomes reachable at all.
 * Rating alone opens the bottom of the ladder so a run that has not placed
 * anything yet is never stuck, but past tier 2 the only thing that moves this
 * is having actually done it — which is what makes a big placement feel like it
 * changed something rather than just paying out a number.
 */
export function reachTier(s) {
  const fromCredits = s.maxPlacementTier + 1;
  const fromRating = s.rating >= 85 ? 3 : s.rating >= 75 ? 2 : 1;
  return Math.max(1, Math.min(5, Math.max(fromCredits, fromRating)));
}

/** Years of elevated reach after a big credit — the phone rings for a while. */
export const HEAT_YEARS = 3;

/**
 * The draw weights for a card cast as 'any', bent toward what you can reach.
 *
 * Flat weights meant the invitation dealt a tier-1 room 40% of the time whether
 * you were sixteen with nothing or forty with a diamond plaque. Now the tiers
 * at and just below your reach are the likely ones, and while you are hot off a
 * big credit the top of that range gets likelier still.
 */
function anyTierOptions(s) {
  const reach = reachTier(s);
  const hot = (s.heat || 0) > 0;
  return openTiers(s)
    .filter(({ tier }) => tier <= reach)
    .map(({ tier, weight }) => {
      const gap = reach - tier;
      // at your reach: heavily favoured; one below: still common; far below:
      // the rooms you have outgrown, which should mostly stop calling
      let bias = gap === 0 ? 3.2 : gap === 1 ? 1.8 : gap === 2 ? 0.7 : 0.25;
      if (hot && gap === 0) bias *= 1.6;
      return { tier, weight: weight * bias };
    });
}

/** The tiers a card cast as 'any' could reach at this age, with weights. */
function openTiers(s) {
  return Object.keys(ANY_TIER_WEIGHT)
    .map(Number)
    .filter((t) => s.age >= TIER_OPENS_AT[t])
    .map((tier) => ({ tier, weight: ANY_TIER_WEIGHT[tier] }))
    .filter(({ tier }) => (ROSTER[TIER_KEY_BY_LEVEL[tier]] || []).length);
}

function poolFor(s, cast) {
  if (!cast) return null;
  if (cast.track === 'underground') return ROSTER.underground_us;
  if (cast.track === 'director') return ROSTER.directors;
  // 'any' is eligible as long as one tier is open — which tier is decided at
  // cast time, not here, so the odds live in one place.
  if (cast.track === 'label') {
    const names = labelArtistNames(s);
    if (!names) return [];
    // Only artists this house actually has, and only ones you are old enough
    // to be in a room with. A nineteen-year-old on a major does not get the
    // biggest act on the roster in their first year.
    const tiered = Object.entries(TIER_KEY_BY_LEVEL)
      .filter(([tier]) => s.age >= TIER_OPENS_AT[tier])
      .flatMap(([, key]) => (ROSTER[key] || []).filter((a) => names.includes(a.name)));
    // Houses like Griselda carry underground names too, and those live outside
    // the tier pools — leaving them out silently shortened those rosters.
    const under = (ROSTER.underground_us || []).filter((a) => names.includes(a.name));
    return [...tiered, ...under];
  }
  if (cast.track === 'any') {
    return openTiers(s).flatMap(({ tier }) => ROSTER[TIER_KEY_BY_LEVEL[tier]] || []);
  }
  const key = TIER_KEY_BY_LEVEL[cast.tier];
  let pool = ROSTER[key] || [];
  if (cast.region) pool = pool.filter((a) => a.region === cast.region);
  else pool = pool.filter((a) => territoryOpen(s, a.region));
  return pool;
}

function castFor(s, card, rand) {
  // 'any' rolls the tier first, so a tier-5 name stays rare no matter how many
  // artists that tier holds. Everything else draws from a single fixed pool,
  // where an even pick across the pool is already the right distribution.
  if (card.cast && card.cast.track === 'any') {
    const tiers = anyTierOptions(s);
    if (!tiers.length) return null;
    const { tier } = weightedPick(tiers, rand);
    const pool = ROSTER[TIER_KEY_BY_LEVEL[tier]] || [];
    const fresh = pool.filter((a) => !s.usedArtists.has(a.name));
    const use = fresh.length ? fresh : pool;
    if (!use.length) return null;
    // The tier rides along on the cast: a card written for 'any' has to size
    // its own payoff, and the artist object is the only thing it is handed.
    return { ...preferLabel(s, use, rand), tier };
  }
  if (card.cast && card.cast.track === 'label') {
    const pool = poolFor(s, card.cast);
    if (!pool || !pool.length) return null;
    // Repeat work with the same artist is the norm inside a house, so used
    // artists are not filtered out here the way they are everywhere else —
    // that is what being on a roster looks like.
    // Weighted by tier, so the name the house is built around headlines: on
    // Cactus Jack you should be in a room with Travis Scott more often than
    // with the newest signing, because that is what the label is.
    const a = weightedPick(pool, rand, (x) => tierOfArtist(x.name) || 1);
    const tier = tierOfArtist(a.name) || 1;
    // Which room it is. Singles are rarer and worth more; most of what you do
    // on a roster is album work.
    return { ...a, tier, single: rand() < 0.35 };
  }
  const pool = poolFor(s, card.cast);
  if (!pool) return null;
  const fresh = pool.filter((a) => !s.usedArtists.has(a.name));
  const use = fresh.length ? fresh : pool;
  if (!use.length) return makeLocalName(rand);
  return preferLabel(s, use, rand);
}

/**
 * Being signed is supposed to mean something concrete: the house's own artists
 * are who you keep ending up with. Sign to Cactus Jack and the Travis Scott and
 * Don Toliver records start piling up, because that is what a deal actually
 * does for a producer. Falls straight through when you are independent, or when
 * none of the roster is castable for this card.
 */
function preferLabel(s, pool, rand) {
  const names = labelArtistNames(s);
  if (names) {
    const own = pool.filter((a) => names.includes(a.name));
    if (own.length && rand() < LABEL_CAST_BIAS) {
      return own[Math.floor(rand() * own.length)];
    }
  }
  return pool[Math.floor(rand() * pool.length)];
}

function meets(s, card) {
  const r = card.req || {};
  const check = (val, req) => {
    if (req === undefined) return true;
    if (Array.isArray(req)) return val >= req[0] && val <= req[1];
    return val >= req;
  };
  if (!check(s.rating, r.rating)) return false;
  if (!check(s.age, r.age)) return false;
  if (r.flags && !r.flags.every((f) => s.flags.has(f))) return false;
  if (r.not && r.not.some((f) => s.flags.has(f))) return false;
  if (card.cast) {
    const pool = poolFor(s, card.cast);
    if (!pool || !pool.length) return false;
    // Nobody gets handed a global icon at seventeen, however gifted they are.
    // Rating alone cannot express this — a 75-talent sixteen-year-old has the
    // ability and none of the career — so the reach is gated on age centrally
    // rather than by editing a tier floor into every card.
    if (card.cast.tier && s.age < TIER_OPENS_AT[card.cast.tier]) return false;
    // ...and you have to have earned your way into rooms that size. One tier
    // above your best credit is as far as anyone will take a chance on you.
    if (card.cast.tier && card.cast.tier > reachTier(s)) return false;
  }
  return true;
}

/** Which tier a roster name sits in, or 0 if it is not a roster artist. */
const ARTIST_TIER = new Map(
  Object.entries(TIER_KEY_BY_LEVEL).flatMap(([tier, key]) =>
    (ROSTER[key] || []).map((a) => [a.name, Number(tier)])),
);
export const tierOfArtist = (name) => ARTIST_TIER.get(name) || 0;

/** The earliest age each roster tier will work with you at all. */
const TIER_OPENS_AT = { 1: 16, 2: 19, 3: 23, 4: 27, 5: 31 };

const placementTier = (c) => (c.accept && c.accept.fx && c.accept.fx.placement
  ? c.accept.fx.placement.tier : 0);

function eligibleCards(s) {
  return CARDS.filter((c) => !s.usedCards.has(c.id) && meets(s, c));
}

function pickOne(pool, rand) {
  const byClass = { RARE: [], CONTRACT: [], COMMON: [] };
  pool.forEach((c) => byClass[c.cls].push(c));
  const options = Object.keys(byClass)
    .filter((k) => byClass[k].length)
    .map((k) => ({ k, weight: CLASS_WEIGHTS[k] || 1 }));
  if (!options.length) return null;
  const chosen = weightedPick(options, rand).k;
  return weightedPick(byClass[chosen], rand, (c) => c.weight || 1);
}

/**
 * Which house is at the table. A renewal always names the label you are already
 * with — that is what makes it a renewal — and anything else picks a house whose
 * hidden OVERALL gate you have cleared.
 */
function labelFor(s, card, rand) {
  if (card.renewal) return s.pendingRenewal ? LABEL_BY_ID.get(s.pendingRenewal) : null;
  return pickLabel(s, rand);
}

/** The two offers for a year. Never the same card twice. */
function drawOffers(s, rand) {
  const pool = eligibleCards(s);
  if (!pool.length) return [];

  // A good night at the rack is a lead, not a number: the year after it, one of
  // the two offers is guaranteed to be a credit. Consumed on the next draw
  // whether or not you take the credit — the lead goes cold either way.
  if (s.flags.has('hot_hands')) {
    s.flags.delete('hot_hands');
    const credits = pool.filter((c) => placementTier(c));
    if (credits.length) {
      const lead = weightedPick(credits, rand, (c) => c.weight || 1);
      const rest = pool.filter((c) => c.id !== lead.id);
      const other = rest.length ? pickOne(rest, rand) : null;
      return other ? [lead, other] : [lead];
    }
  }

  // THE HOUSE'S OWN ROOM. Being signed to OVO and never once being in a room
  // with Drake is the deal failing to be a deal. The casting bias alone could
  // not promise this — it only fires when a card happens to cast a tier the
  // label has artists in, so a whole contract could go by without one. While
  // signed, the label session takes a slot outright if it has not come round
  // in the last two years.
  if (s.label) {
    const since = s.turn - (s.lastLabelSession ?? -99);
    const session = pool.find((c) => c.labelSession);
    if (session && since >= 2) {
      const rest = pool.filter((c) => c.id !== session.id);
      const other = rest.length ? pickOne(rest, rand) : null;
      return other ? [session, other] : [session];
    }
  }

  // A promised payoff (the manager audit) never waits on a die roll — it takes
  // the first slot outright.
  const forced = pool.find((c) => (c.weight || 1) >= 9 && !placementTier(c));
  const first = forced || pickOne(pool, rand);
  if (!first) return [];
  const rest = pool.filter((c) => c.id !== first.id);
  const second = rest.length ? pickOne(rest, rand) : null;
  return second ? [first, second] : [first];
}

/* ------------------------------------------------------------------ */
/* TURN FLOW                                                           */
/* ------------------------------------------------------------------ */

function turnRand(s, salt) {
  return mulberry32(hashSeed(`${s.seed}|${s.turn}|${salt}`));
}

/** Deal the year's two offers. */
export function beginYear(s) {
  const rand = turnRand(s, 'deck');
  s.offers = drawOffers(s, rand).map((card) => {
    const r = mulberry32(hashSeed(`${s.seed}|${s.turn}|cast|${card.id}`));
    return {
      card,
      cast: castFor(s, card, r),
      // A label offer names the house at draw time, the same way a normal card
      // names its artist, so the offer on screen is the offer that resolves.
      label: card.labelOffer ? labelFor(s, card, r) : null,
    };
  });
  s.phase = s.offers.length ? 'choose' : 'resolve-empty';
  if (!s.offers.length) return resolveYear(s, -1);
  return s;
}

/**
 * The tokens a card's body and diary can interpolate. One builder so the text
 * on the offer screen and the text in the diary cannot drift apart.
 */
export function cardVars(offer, age) {
  return {
    artist: offer && offer.cast ? offer.cast.name : 'them',
    label: offer && offer.label ? offer.label.name : 'the label',
    labelLine: offer && offer.label ? offer.label.line : 'a house with a roster',
    age,
  };
}

/** True when taking this offer means playing The Rack before the year resolves. */
export const offerIsRack = (o) => !!(o && o.card && o.card.rack);

/**
 * The odds printed on a yellow card, as a 0–1 chance, or null if it is green.
 *
 * A card may state a flat number or work them out from who it cast — the studio
 * invitation is the same card whether the room belongs to a kid from your
 * neighbourhood or the biggest artist alive, and it should not be the same bet.
 * Both the offer screen and the resolver read the odds through here, so what
 * the player is shown is by construction the number that gets rolled.
 */
export function gambleChance(card, cast) {
  if (!card || !card.gamble) return null;
  const c = card.gamble.chance;
  return typeof c === 'function' ? c(cast) : c;
}

/**
 * Commit the year. `pick` is the index of the chosen offer, or -1 for a year
 * where nothing was on the table.
 *
 * `extra.rack` carries the result of a rack session for a rack offer. It is the
 * one thing the engine cannot decide on its own — it is what the player did —
 * so the screen plays the session first and hands the result back here.
 */
export function resolveYear(s, pick, extra = {}) {
  const rand = turnRand(s, 'resolve');
  // What the player had on screen when the year started. The delta has to
  // track the number they can see, which now includes form.
  const shownBefore = shownRating(s);
  const events = [];
  const offers = s.offers || [];
  const taken = pick >= 0 ? offers[pick] : null;

  // Every offer dealt this year leaves the deck, taken or not. Passing on
  // something is the cost of taking the other thing.
  offers.forEach((o) => { if (!o.card.repeatable) s.usedCards.add(o.card.id); });

  let cardLine = null;
  let action = 'A quiet year';
  let rack = null;
  let gamble = null;
  if (taken) {
    s.card = taken.card;
    s.cast = taken.cast;
    action = taken.card.title;
    if (taken.cast) s.usedArtists.add(taken.cast.name);

    // THE GAMBLE. A yellow card states its odds on its face and then rolls
    // them. This is the one place the game rolls dice on a choice the player
    // made — everywhere else the only randomness is which cards are dealt —
    // and it is declared to the player before they commit, which is what makes
    // it a gamble rather than a trick.
    if (taken.card.gamble) {
      const chance = gambleChance(taken.card, taken.cast);
      const won = turnRand(s, `gamble|${taken.card.id}`)() < chance;
      // The swing is FORM, never permanent rating. Three lost bets used to
      // strip fifteen points of career; now they cost you a bad couple of
      // years that a single real credit wipes out.
      const [up, down] = taken.card.stakes || [2, -2];
      const swing = won ? up : down;
      const moved = applyTemp(s, swing);
      gamble = { won, chance, stakes: taken.card.stakes || [2, -2], swing, moved };
      if (!won) {
        const fail = taken.card.fail || {};
        events.push(...applyFx(s, fail.fx));
        if (fail.diary) {
          cardLine = fill(fail.diary, cardVars(taken, s.age));
        }
      }
    }
    if (taken.card.labelSession) s.lastLabelSession = s.turn;
    if (taken.card.labelOffer && taken.label) {
      const years = signLabel(s, taken.label, turnRand(s, `sign|${taken.label.id}`));
      s.flags.delete('label_renewal');
      s.pendingRenewal = null;
      s.labelHistory.push({ name: taken.label.name, from: TURNS[s.turn].year, years });
      events.push({ kind: 'signed', name: taken.label.name, years });
    }
    if (taken.card.rack) {
      // The rack pays out on the session, not on the card. Scored before the
      // visit is counted so the first visit is scored as the first visit.
      rack = scoreRackVisit(extra.rack, s.rackVisits);
      s.rackVisits += 1;
      if (rack.rating) events.push({ kind: 'rating', amount: rack.rating });
      if (rack.hotHands) s.flags.add('hot_hands');
    }
    // A lost gamble has already paid out its own consequences above; the
    // accept effects are what you were reaching for and do not land.
    if (!gamble || gamble.won) {
      events.push(...applyFx(s, taken.card.accept.fx));
      if (taken.card.accept.diary) {
        cardLine = fill(taken.card.accept.diary, cardVars(taken, s.age));
      }
    }
    if (s.flags.has('manager_pending') && s.managerHonest === null) {
      s.managerHonest = rand() < 0.55; // rolled at signing, revealed years later
    }
  } else {
    s.card = null; s.cast = null;
  }
  // A renewal you did not take is a renewal you turned down. The offer does not
  // sit open, and the label does not ask twice.
  if (s.flags.has('label_renewal') && !(taken && taken.card.renewal)) {
    const lapsed = LABEL_BY_ID.get(s.pendingRenewal);
    if (lapsed && !cardLine) cardLine = `you let the deal with ${lapsed.name} lapse and went back to answering your own emails.`;
    s.flags.delete('label_renewal');
    s.pendingRenewal = null;
    if (s.label) { s.label = null; s.flags.delete('signed'); events.push({ kind: 'labelLeft' }); }
  }

  // 3. the world starts taking it back
  //
  // Relevance is rented, not owned. Without a real decline the arithmetic of
  // 34 years does not work: roughly eighteen of them score, seven lose, and
  // every strategy drifts to 99 no matter what it picks. Decay is what makes
  // the back half of a career about holding on to something rather than
  // continuing to accumulate — and it is what makes a quiet year at 44 cost
  // you, which is true to the thing being simulated.
  //
  // A year where you actually made something big is exempt: staying relevant
  // is the whole defence against this.
  const decay = decayFor(s);

  // 4. certifications land one to two turns after the placement
  const certEvents = resolveCertifications(s, rand);

  // 5. queue certifications for anything made this turn
  s.placements
    .filter((p) => p.turn === s.turn && p.tier >= 2 && !p.underground && !p.certQueued)
    .forEach((p) => {
      p.certQueued = true;
      s.pendingCerts.push({ tier: p.tier, artist: p.artist, resolveTurn: s.turn + (rand() < 0.5 ? 1 : 2) });
    });

  // 6. awards
  const awardEvents = resolveAwards(s, rand);

  // 6b. the contract runs down. Ticked here, after this year's credits are on
  //     the board, so the final year of a deal is judged including what you
  //     just did with it.
  const labelEvent = tickLabel(s, turnRand(s, 'label'));
  if (labelEvent) {
    events.push(labelEvent);
    // Being dropped costs you. Not much — it is the lost access that hurts.
    if (labelEvent.kind === 'labelDropped') events.push({ kind: 'rating', amount: -2 });
  }

  // 7. the manager reveal, six years on
  if (s.flags.has('manager_pending')) {
    if (!s.managerRevealTurn) s.managerRevealTurn = s.turn + 2;
    else if (s.turn >= s.managerRevealTurn) {
      s.flags.delete('manager_pending');
      s.flags.add(s.managerHonest ? 'manager_reveal_good' : 'manager_reveal_bad');
    }
  }

  // 8. the rating moves — one whole-number move for the whole year.
  //    Everything that happened this turn queued a `rating` event; the lot is
  //    summed, scaled by prodigy/plateau growth and the ceiling, and rounded.
  const ratingBefore = s.rating;
  const earned = [...events, ...certEvents, ...awardEvents]
    .reduce((a, e) => a + (e.kind === 'rating' ? e.amount : 0), 0);
  // Earnings and decay are applied separately. Netting them first meant a year
  // that earned 3 and decayed 2 was scaled as a GAIN of 1 — the decay was
  // quietly being discounted by the gain curve instead of costing what it says.
  applyRating(s, earned);
  if (decay) applyRating(s, -decay);
  // A jump is a card handing you a career in one turn — it bypasses scaling.
  // Certifications queue jumps too, so they have to be summed here as well;
  // reading only `events` silently dropped every plaque's contribution.
  const rawJump = ratingJumpFrom([...events, ...certEvents]);
  const jump = applyJump(s, rawJump);
  const ratingMove = s.rating - ratingBefore;

  // 8b. FORM SETTLES. Anything real that landed this year banks whatever you
  //     are carrying into permanent rating; a quiet year bleeds a point of it
  //     back toward zero. Age decay above already came off the permanent
  //     number only, so an old producer can still run hot and still slide.
  const bankedSomething = madeThisYearForBank(s) || certEvents.some((e) => e.level)
    || awardEvents.some((e) => e.won);
  const banked = settleTemp(s, bankedSomething);

  // 9. THE PLATEAU — the prodigy who simply stops. Rolled once per turn from
  //    turn 3 on, and permanent when it lands.
  let plateauedNow = false;
  if (s.prodigy && !s.plateaued && s.turn >= PLATEAU_FROM_TURN
      && turnRand(s, 'plateau')() < PLATEAU_CHANCE) {
    s.plateaued = true;
    s.plateauedAt = s.age;
    plateauedNow = true;
  }

  // 10. the year's line in the log
  const plaques = { gold: 0, platinum: 0, multi: 0, diamond: 0 };
  certEvents.forEach((e) => { if (e.level) plaques[e.level] += 1; });
  const awards = {};
  awardEvents.forEach((e) => {
    if (!e.won) return;
    const k = e.kind === 'GRAMMY' ? 'GRM' : e.kind === 'OSCAR' ? 'OSC' : 'EMY';
    awards[k] = (awards[k] || 0) + 1;
  });
  const madeThisYear = s.placements.filter((p) => p.turn === s.turn);
  // The loudest label thing that happened this year, if any.
  const labelNote = events.find((e) => ['signed', 'labelDropped', 'labelLeft'].includes(e.kind)) || null;
  const entry = {
    year: TURNS[s.turn].year,
    age: s.age,
    action,
    // The two numbers the log now carries per year: where the overall stood
    // when the year closed, and how many people heard your catalogue. Streams
    // are derived from every placement you have ever made, so this grows as a
    // body of work rather than resetting each year — see engine/streams.js.
    ovr: shownRating(s),
    streams: yearStreams(s),
    plaques,
    awards: Object.entries(awards).map(([type, count]) => ({ type, count })),
    outcome: rack ? rackOutcome(rack)
      : yearOutcome({ taken, madeThisYear, plaques, awards, ratingMove, plateauedNow, jump, gamble, label: labelNote }),
    valence: rack && rack.hotHands ? 'standout'
      : yearValence({ madeThisYear, plaques, awards, ratingMove, plateauedNow, jump, gamble, label: labelNote }),
  };
  s.log.push(entry);

  const line = writeDiaryLine({ age: s.age, cardLine, condition: null }, turnRand(s, 'diary'));
  s.diary.push({ age: s.age, text: line.text, weight: line.weight });

  s.report = {
    age: s.age,
    year: TURNS[s.turn].year,
    card: s.card,
    cast: s.cast,
    pick,
    passed: offers.filter((_, i) => i !== pick).map((o) => o.card),
    ratingMove,
    shownMove: shownRating(s) - shownBefore,
    ratingJump: jump,
    rack,
    gamble,
    banked,
    temp: s.temp,
    label: labelNote,
    plateauedNow,
    diary: line.text,
    decay,
    entry,
    events,
    certEvents,
    awardEvents,
  };
  s.offers = [];
  s.phase = 'resolve';
  return s;
}

/**
 * Did anything land this year worth banking form for?
 *
 * A tier-2 credit or better, not any credit at all. Banking off a tier-1
 * mixtape cut made form a reliable income stream rather than a reward — you
 * could carry a good bet indefinitely and cash it on the smallest thing that
 * came along. The bar is a record somebody actually heard.
 */
function madeThisYearForBank(s) {
  return s.placements.some((p) => p.turn === s.turn && !p.underground && p.tier >= 2);
}

/** One short sentence for the log's HOW IT LANDED column. */
function yearOutcome({ taken, madeThisYear, plaques, awards, ratingMove, plateauedNow, jump, gamble, label }) {
  const plaqueCount = Object.values(plaques).reduce((a, b) => a + b, 0);
  const awardCount = Object.values(awards).reduce((a, b) => a + b, 0);
  if (label && label.kind === 'signed') {
    return `Signed. ${label.years} year${label.years === 1 ? '' : 's'}.`;
  }
  if (label && label.kind === 'labelDropped') return 'They let you go.';
  if (label && label.kind === 'labelLeft') return 'You walked.';
  if (jump > 0) return 'Everything changed.';
  // A lost bet is the loudest thing that can happen in a year — it gets said
  // before any of the ordinary readings below.
  if (gamble && !gamble.won) return 'You called it wrong.';
  if (plateauedNow) return 'Something levelled off.';
  if (awardCount) return awardCount > 1 ? 'They called your name twice.' : 'They called your name.';
  if (plaqueCount) return plaqueCount > 1 ? 'Plaques on the wall.' : 'It got certified.';
  if (madeThisYear.length) {
    const p = madeThisYear[0];
    if (p.underground) return 'Nobody heard it. It mattered.';
    return p.tier >= 4 ? 'It was everywhere.' : 'A credit, at least.';
  }
  if (!taken) return 'Nothing came.';
  if (ratingMove < 0) return 'It cost you.';
  if (ratingMove === 0) return 'The year went nowhere.';
  return ratingMove >= 3 ? 'It worked.' : 'A little better.';
}

function yearValence({ madeThisYear, plaques, awards, ratingMove, plateauedNow, jump, gamble, label }) {
  const awardCount = Object.values(awards).reduce((a, b) => a + b, 0);
  if (label && label.kind === 'signed') return 'standout';
  if (label && (label.kind === 'labelDropped' || label.kind === 'labelLeft')) return 'setback';
  if (jump > 0 || awardCount || plaques.diamond) return 'standout';
  if (gamble && !gamble.won) return 'setback';
  if (plateauedNow || ratingMove < 0) return 'setback';
  if (madeThisYear.length || plaques.gold || plaques.platinum || ratingMove >= 3) return 'good';
  return 'neutral';
}

export function advance(s) {
  if (s.heat > 0) s.heat -= 1;
  s.turn += 1;
  if (s.turn >= TURNS.length) return retire(s, false);
  s.age = TURNS[s.turn].age;
  s.card = null;
  s.cast = null;
  return beginYear(s);
}

/** The age the years start taking it back, and the age they start hurting. */
export const DECAY_FROM_AGE = 34;
export const DECAY_BITES_AGE = 42;

/**
 * What this year costs you for not being current.
 *
 * Nothing at all before 32. After that a year with no credit costs a point,
 * and from 42 it costs two. A credit of tier 3 or better cancels it outright —
 * you are still in the room, so nothing erodes. A small credit halves it.
 */
function decayFor(s) {
  if (s.age < DECAY_FROM_AGE) return 0;
  const made = s.placements.filter((p) => p.turn === s.turn);
  const big = made.some((p) => p.tier >= 3);
  // Ramps with age. Through the thirties a real credit still holds it off
  // completely; past the mid-forties nothing does entirely, and the last years
  // come off the number whatever you do. That tail is the shape of the thing —
  // a career ends by declining, not by stopping.
  const base = s.age >= 44 ? 2 : s.age >= 39 ? 2 : 1;
  if (big) return Math.max(0, base - 2);
  if (made.length) return Math.max(0, base - 1);
  return base;
}

/** Cards may carry an outright rating jump on top of their stat movement. */
function ratingJumpFrom(events) {
  return events.reduce((a, e) => a + (e.kind === 'ratingJump' ? e.amount : 0), 0);
}


function resolveCertifications(s, rand) {
  const out = [];
  const still = [];
  for (const q of s.pendingCerts) {
    if (q.resolveTurn > s.turn) { still.push(q); continue; }
    const boost = s.rating / 900;
    const table = {
      2: { gold: 0.25 },
      3: { gold: 0.6, platinum: 0.2 },
      4: { gold: 0.85, platinum: 0.5, multi: 0.15 },
      // Cut twice, for the same reason each time: every change that gets you
      // into bigger rooms (reach, then guaranteed label sessions) multiplies
      // tier-5 credits, and Diamond rides on those. 0.04 -> 0.018 -> 0.010.
      // The plaque has to stay the rarest thing in the game.
      5: { gold: 0.97, platinum: 0.8, multi: 0.45, diamond: 0.042 },
    }[q.tier] || {};
    const u = rand();
    let level = null;
    // The rating boost is a big shift — a tenth of the whole range at OVR 90 —
    // and applying it to Diamond drowned the threshold completely: a 0.010
    // chance became an 11% one, which is why cutting the number twice barely
    // moved the count. Diamond gets a fraction of the boost; everything else
    // gets all of it, because those SHOULD get easier as you get better.
    if (table.diamond !== undefined && u < table.diamond + boost * 0.12) level = 'diamond';
    else if (table.multi !== undefined && u < table.multi + boost) level = 'multi';
    else if (table.platinum !== undefined && u < table.platinum + boost) level = 'platinum';
    else if (table.gold !== undefined && u < table.gold + boost) level = 'gold';
    if (level) {
      s.certs[level] += 1;
      // A jump, not ordinary points: a plaque should read the same at OVR 85
      // as it does at 60, and it is the dependable way up the back half.
      out.push({ kind: 'ratingJump', amount: CERT_JUMP[level] });
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
  const credit = (won) => { out.push({ kind: 'rating', amount: won ? 3 : 1 }); };

  for (const p of thisTurn) {
    // GRAMMY
    if (!p.underground && p.tier >= 3 && s.rating >= 90) {
      const noms = 1 + (p.tier >= 5 && s.rating >= 96 ? 1 : 0);
      for (let i = 0; i < noms; i++) {
        const cat = GRAMMY_CATEGORIES[Math.floor(rand() * GRAMMY_CATEGORIES.length)];
        s.awards.grammyNoms += 1;
        let win = 0.05 + (s.rating - 88) / 300 + (p.tier - 3) * 0.06;
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
    if (p.score && !p.tv && s.rating >= 88) {
      s.awards.oscarNoms += 1;
      const won = rand() < Math.min(0.6, 0.18 + (s.rating - 78) / 150);
      if (won) s.awards.oscarWins += 1;
      credit(won);
      s.awards.list.push({ kind: 'OSCAR', category: 'Best Original Score', age: s.age, won, artist: p.artist });
      out.push({ kind: 'OSCAR', category: 'Best Original Score', won, artist: p.artist });
    }
    // EMMY — television
    if (p.tv && s.rating >= 84) {
      s.awards.emmyNoms += 1;
      const won = rand() < Math.min(0.6, 0.22 + s.rating / 350);
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
    maxStatus: s.maxStatus,
    talent: s.talent,
    rating: s.rating,
    prodigy: s.prodigy,
    plateaued: s.plateaued,
    plateauedAt: s.plateauedAt,
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
  n += r.rating * 60;
  n += r.placements.reduce((a, p) => a + [0, 40, 180, 700, 2400, 8000][p.tier], 0);
  n += r.awards.grammyWins * 2500 + r.awards.grammyNoms * 600;
  n += r.awards.oscarWins * 4000 + r.awards.oscarNoms * 1000;
  n += r.awards.emmyWins * 2000 + r.awards.emmyNoms * 500;
  n += r.certs.gold * 300 + r.certs.platinum * 900 + r.certs.multi * 2200 + r.certs.diamond * 9000;
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




export function mergeIntoCabinet(cabinet, s) {
  const c = { ...cabinet, certs: { ...cabinet.certs } };
  c.runs += 1;
  c.retirementAges = [...c.retirementAges, s.retiredAge];
  c.longestCareer = Math.max(c.longestCareer, s.retiredAge - 14);
  c.bestRating = Math.max(c.bestRating || 0, s.rating);
  c.grammyWins += s.awards.grammyWins;
  c.grammyNoms += s.awards.grammyNoms;
  c.oscarWins += s.awards.oscarWins;
  c.oscarNoms += s.awards.oscarNoms;
  c.emmyWins += s.awards.emmyWins;
  c.emmyNoms += s.awards.emmyNoms;
  for (const k of Object.keys(c.certs)) c.certs[k] += s.certs[k];

  const chartsThisRun = s.placements.map((p) => NAME_TO_CHART.get(p.artist)).filter(Boolean);
  c.chartsLanded = [...new Set([...(c.chartsLanded || []), ...chartsThisRun])];


  const placedNames = s.placements.map((p) => p.artist).filter((n) => ROSTER_ARTIST_NAMES.has(n));
  c.artistsPlaced = [...new Set([...(c.artistsPlaced || []), ...placedNames])];

  const loyal = s.loyalProducerThisRun || [];
  c.loyalProducer = [...new Set([...(c.loyalProducer || []), ...loyal])];

  return c;
}

export function shareText(s) {
  const a = s.awards;
  const cz = s.certs;
  const lines = [];
  lines.push('BASEMENT');
  lines.push(`16 → ${s.retiredAge} · OVR ${s.rating}`);
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
