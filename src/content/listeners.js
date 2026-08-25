/**
 * listeners.js — monthly listeners, as the game's unit of how big somebody is.
 *
 * The credits list used to print the internal tier number, which is a designer's
 * word for a thing the player already understands in a different unit. "TIER 3"
 * means nothing at a glance; "4.2M monthly" places somebody instantly.
 *
 * THESE NUMBERS ARE INVENTED. They are derived from the artist's tier in this
 * game, not looked up from any streaming service, and they do not track the
 * real figures for the real people whose names the roster borrows. They exist
 * to make the roster legible in one glance and to make the difference between
 * a tier-1 and a tier-4 credit land as something other than a number nobody
 * outside this codebase has a feel for.
 *
 * They are stable per artist: the same name always produces the same count, so
 * an artist does not shift size between the credits list and the tape strip, or
 * between one run and the next.
 */

/**
 * Plausible monthly-listener bands per tier, sampled log-uniformly so the
 * spread within a band looks like a real distribution rather than an even
 * scatter — most of a tier sits nearer its floor, a few near its ceiling.
 */
const BANDS = {
  5: [28_000_000, 88_000_000],
  4: [8_500_000, 28_000_000],
  3: [2_200_000, 8_500_000],
  2: [550_000, 2_200_000],
  1: [45_000, 550_000],
};

/** The underground track is small on purpose — that is the whole point of it. */
const UNDERGROUND_BAND = [9_000, 280_000];

/* A tiny self-contained hash so this file stays pure content and does not have
   to reach into the engine's RNG. Same string in, same number out, forever. */
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}

/** Round to something that reads like a reported figure, not a measurement. */
function tidy(n) {
  if (n >= 10_000_000) return Math.round(n / 1_000_000) * 1_000_000;
  if (n >= 1_000_000) return Math.round(n / 100_000) * 100_000;
  if (n >= 100_000) return Math.round(n / 10_000) * 10_000;
  return Math.round(n / 1_000) * 1_000;
}

export function listenersFor(name, tier, underground) {
  const band = underground ? UNDERGROUND_BAND : BANDS[tier];
  if (!band) return null;
  const [lo, hi] = band;
  const t = hash(name);
  return tidy(Math.exp(Math.log(lo) + t * (Math.log(hi) - Math.log(lo))));
}

/**
 * 30M · 1.2M · 500K · 42K
 *
 * One decimal only below 10M, where the difference between 1.2M and 1.8M is
 * information; above it, nobody reads the tenths.
 */
export function formatListeners(n) {
  if (n === null || n === undefined) return null;
  if (n >= 10_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}
