import { listenersOf } from '../content/roster.js';
import { hashSeed, mulberry32 } from './rng.js';

/**
 * streams.js — how many people actually heard your year.
 *
 * The log could say what you did and how the rating moved, but not the one
 * number a producer actually lives by. Streams are that number, and they are
 * derived rather than stored: a year's total is the sum of every record you
 * have ever made, each still earning at a decayed rate.
 *
 * That derivation is the point. It means a placement is not a one-year event
 * that pays out and disappears — it is a thing that keeps working for you, and
 * a catalogue is visibly worth more than a single good year. It also means an
 * old producer with nothing new still posts real numbers, which is true.
 */

/**
 * What a record does in its first year, as a multiple of the artist's monthly
 * listeners. Bigger acts convert a credit into more, and not only because they
 * have more listeners — a tier-5 record is promoted, playlisted and toured in
 * a way a tier-1 one is not.
 *
 * These were 2.5x to 10x, which put a single album cut by a 132M-listener
 * artist at 1.3 BILLION in its first year — more than almost any real song
 * manages in its entire life. Every career was posting numbers that should
 * belong to a handful of them, which is what made "2B streams" look ordinary.
 * A tier-5 album cut now does 140-400M and a tier-5 single 300-880M, which is
 * roughly what a smash actually does.
 */
const TIER_MULTIPLE = { 1: 0.5, 2: 0.7, 3: 1.0, 4: 1.4, 5: 1.9 };

/**
 * THE TAIL. Index is years since release.
 *
 * This was far too steep — a 10M record fell to 4.2M in its second year and
 * under a million by its fifth, which is not how catalogue behaves. A record
 * that works does something close to its first-year number again in year two,
 * eases off over the next few, and then settles into a plateau it holds more
 * or less indefinitely. That plateau is the whole reason a catalogue is worth
 * having: land one big placement at twenty-one and you never drop back to a
 * few hundred streams again, because that song is still being played.
 *
 * Anything past the table sits on the last value, which is the plateau.
 */
const DECAY = [1, 0.90, 0.72, 0.58, 0.48, 0.42, 0.37, 0.33, 0.30, 0.28, 0.26, 0.24, 0.22, 0.21, 0.20];

/**
 * LEGS — how long an individual record lasts, 0.78x to 1.28x the standard tail.
 *
 * Two records the same size do not age the same way. One is still on every
 * playlist five years later and one is not, and the difference is not
 * something you chose — so it is rolled per record and applied to everything
 * after the first year. At the top of the range a song's second year actually
 * beats its first, which is the one that got away and then came back.
 */
function legsOf(p) {
  return 0.78 + rand01(`${p.artist}|${p.turn}|legs`) * 0.5;
}

/** Credits with nobody real behind them — a session nobody documented. */
const UNCREDITED_FIRST_YEAR = [400, 26_000];

function rand01(key) {
  return mulberry32(hashSeed(key))();
}

/** A single record's first-year streams. Deterministic per placement. */
export function firstYearStreams(p) {
  const r = rand01(`${p.artist}|${p.turn}|streams`);
  const listeners = listenersOf(p.artist);
  if (listeners === null) {
    // A television series, a short film, an uncredited session: no artist and
    // therefore no audience to scale from. These are the few-hundred years.
    const [lo, hi] = UNCREDITED_FIRST_YEAR;
    return Math.round(lo + r * (hi - lo));
  }
  const mult = TIER_MULTIPLE[p.tier] || 2;
  // 0.55x to 1.6x, so two credits with the same artist are not the same record.
  const swing = 0.55 + r * 1.05;
  const underground = p.underground ? 0.35 : 1;
  // A single is the record the campaign is built around; an album cut is the
  // ninth track. Same artist, same room, very different number.
  const single = p.single ? 2.2 : 1;
  return Math.round(listeners * mult * swing * underground * single);
}

/** What one record earns in a given year of its life. */
function streamsInYear(p, yearsOld) {
  if (yearsOld < 0) return 0;
  const base = firstYearStreams(p);
  if (yearsOld === 0) return base;
  const d = DECAY[Math.min(yearsOld, DECAY.length - 1)];
  return Math.round(base * d * legsOf(p));
}

/**
 * SESSION WORK — the floor under every year.
 *
 * Once you are past eighteen it should be rare to have a year where nobody
 * heard anything of yours. Most working producers are always on something, and
 * most of it is small: a local record, a mixtape cut, a session nobody wrote
 * down. This is that, and it is deliberately NOT a placement — it does not
 * become a credit, does not enter the artist album, and cannot be certified.
 * It exists so the streams line has a floor instead of a hole.
 *
 * It scales with rating because a better producer picks up better session work,
 * but it stays small enough that it never competes with a real credit.
 */
export function sessionStreams(s) {
  if (s.age < 18) return 0;
  const r = rand01(`${s.seed}|${s.turn}|session`);
  // ~11% of years have nothing at all going on, so the floor is a floor and
  // not a guarantee.
  if (r < 0.11) return 0;
  const base = 300 + Math.pow(Math.max(0, s.rating - 40), 2.1) * 2.4;
  return Math.round(base * (0.5 + r * 1.4));
}

/** Everything anyone streamed of yours this year: catalogue plus session work. */
export function yearStreams(s) {
  const catalogue = s.placements.reduce(
    (total, p) => total + streamsInYear(p, s.turn - p.turn),
    0,
  );
  return catalogue + sessionStreams(s);
}

/**
 * 1.2B · 340M · 12M · 890K · 4,200
 *
 * Small numbers stay exact — the difference between 400 and 4,000 streams is
 * the difference between nobody and a few hundred people, and rounding it to
 * "0K" would throw away the only information a quiet year carries.
 */
export function formatStreams(n) {
  if (!n) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 10_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
