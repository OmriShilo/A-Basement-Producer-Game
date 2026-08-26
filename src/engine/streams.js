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
 */
const TIER_MULTIPLE = { 1: 2.5, 2: 3.5, 3: 5, 4: 7, 5: 10 };

/**
 * The long tail. Index is years since release: a record does most of its work
 * immediately, then keeps earning at a shrinking rate more or less forever.
 * Anything past the table sits on the last value.
 */
const DECAY = [1, 0.42, 0.2, 0.12, 0.08, 0.06, 0.05, 0.04, 0.035, 0.03, 0.025, 0.02];

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
  return Math.round(listeners * mult * swing * underground);
}

/** What one record earns in a given year of its life. */
function streamsInYear(p, yearsOld) {
  if (yearsOld < 0) return 0;
  const d = DECAY[Math.min(yearsOld, DECAY.length - 1)];
  return Math.round(firstYearStreams(p) * d);
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
