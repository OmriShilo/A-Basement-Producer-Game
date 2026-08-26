import { LABELS } from '../content/labels.js';
import { ROSTER } from '../content/roster.js';

/**
 * labels.js — signing, serving out a term, and what happens when it ends.
 *
 * A label deal is the only thing in the game that spans years. Everything else
 * is decided and finished inside one turn; a contract is a state you are in,
 * which is why it gets its own module and its own indicator on screen.
 *
 * The deal does three things:
 *   1. It puts the label's artists in your path. This is the whole point —
 *      signing to Cactus Jack should mean Travis Scott and Don Toliver records,
 *      not an abstract bonus.
 *   2. It runs for a fixed term, 1 to 4 years, set when you sign.
 *   3. It ends in a decision that is not yours. They renew or they drop you,
 *      and which one depends on what you did with the years they paid for.
 */

/* Every label roster must name artists who actually exist in roster.js — a
   typo would otherwise degrade silently into "this label has no artists" and
   the deal would quietly do nothing. Checked once, at import. */
const ROSTER_NAMES = new Set(Object.values(ROSTER).flat().map((a) => a.name));
const UNKNOWN = LABELS.flatMap((l) => l.artists.filter((n) => !ROSTER_NAMES.has(n)));
if (UNKNOWN.length) {
  throw new Error(
    `labels.js names artists missing from roster.js: ${[...new Set(UNKNOWN)].join(', ')}`
  );
}

/** How often the label's own roster wins the casting when you are signed. */
export const LABEL_CAST_BIAS = 0.8;

/** Labels that would have you, given how far you can currently reach. */
export function labelsOpenTo(s, reach) {
  return LABELS.filter((l) => l.reach <= reach && (!s.label || s.label.id !== l.id));
}

export function pickLabel(s, reach, rand) {
  const open = labelsOpenTo(s, reach);
  if (!open.length) return null;
  // The houses nearest your reach are the ones actually interested; the ones
  // far below it have stopped being a step up.
  const weighted = open.map((l) => ({ l, weight: Math.max(1, 5 - (reach - l.reach) * 2) }));
  const total = weighted.reduce((a, x) => a + x.weight, 0);
  let r = rand() * total;
  for (const x of weighted) { r -= x.weight; if (r <= 0) return x.l; }
  return open[open.length - 1];
}

export function signLabel(s, label, rand) {
  const [lo, hi] = label.term;
  const years = lo + Math.floor(rand() * (hi - lo + 1));
  s.label = {
    id: label.id,
    name: label.name,
    kind: label.kind,
    years,
    left: years,
    signedAt: s.turn,
    creditsAtSign: s.placements.length,
    ratingAtSign: s.rating,
    renewals: s.label && s.label.id === label.id ? (s.label.renewals || 0) + 1 : 0,
  };
  return years;
}

/** The artists a signed producer keeps ending up with. Empty when independent. */
export function labelArtistNames(s) {
  if (!s.label) return null;
  const l = LABELS.find((x) => x.id === s.label.id);
  return l ? l.artists : null;
}

/**
 * Did the deal work?
 *
 * Judged on what the label paid for: records, and whether you got better. One
 * credit per two years under contract is the bar, and a clear rating gain will
 * carry a term that did not produce much on its own — a label will keep a
 * producer who is visibly improving.
 */
export function dealWentWell(s) {
  const c = s.label;
  if (!c) return false;
  const credits = s.placements.filter((p) => p.turn >= c.signedAt && !p.underground).length;
  const grew = s.rating - c.ratingAtSign;
  return credits >= Math.ceil(c.years / 2) || grew >= 4;
}

/**
 * Tick one year off the contract. Returns an event describing what happened,
 * or null while the term is still running.
 *
 * Renewal is not automatic even when the deal went well — a house that likes
 * you can still decide it is done — which keeps the end of a term from being
 * a formality you can plan around.
 */
export function tickLabel(s, rand) {
  if (!s.label) return null;
  // The term starts the year AFTER you sign. This year's artists were cast in
  // beginYear, before the deal existed, so counting the signing year would give
  // you a year of contract you never actually got to spend — and a one-year
  // deal would be over before it did anything at all.
  if (s.label.signedAt === s.turn) return null;
  s.label.left -= 1;
  if (s.label.left > 0) return null;

  const well = dealWentWell(s);
  const name = s.label.name;
  const renew = well && rand() < 0.75;
  if (renew) {
    // They want another term. The offer arrives as next year's card, so it is
    // still a choice — you are allowed to walk.
    s.flags.add('label_renewal');
    s.pendingRenewal = s.label.id;
    return { kind: 'labelExpiring', name, renew: true };
  }
  s.label = null;
  s.flags.delete('signed');
  s.flags.add('was_dropped');
  return { kind: 'labelDropped', name, well };
}

/** What the indicator shows. */
export function labelStatus(s) {
  if (!s.label) return { signed: false, text: 'INDEPENDENT' };
  const { name, left, years } = s.label;
  return {
    signed: true,
    name,
    left,
    years,
    text: `${name} · ${left} of ${years} yr${years === 1 ? '' : 's'} left`,
  };
}
