/**
 * THE RACK — what a year spent at the keys is worth.
 *
 * The rack is the one place the career stops being a card draw and asks you to
 * actually do something, so it has to pay out on what you did, not on a roll.
 * Three rules shape the table below:
 *
 * 1. It scores DISTINCT chords, not notes. Notes reward mashing; one chord
 *    shape replayed forty times rewards patience with a mouse. Distinct chords
 *    are the only one of the three that tracks having found something.
 * 2. It pays less each time. A repeatable card that reliably beats the deck
 *    would make every other offer a mistake, so the return drops by one every
 *    third visit. Early on the rack is a real answer to a thin year; late on it
 *    is a way to pass the time.
 * 3. It costs the year. The rack occupies one of the two offers, so taking it
 *    is turning down whatever else was on the table — that is its real price,
 *    and it is why the payout can afford to be generous on a first visit.
 *
 * The rating it returns is raw: resolveYear feeds it through applyRating like
 * any other earning, so the ceiling and the prodigy/plateau multipliers all
 * still apply on top.
 */

/** Distinct chords found -> raw rating, before falloff and scaling. */
const CHORD_TABLE = [
  { min: 10, rating: 5 },
  { min: 6, rating: 4 },
  { min: 3, rating: 3 },
  { min: 1, rating: 2 },
  { min: 0, rating: 0 },
];

/** Chords in one sitting that leave you with something worth pitching. */
export const HOT_HANDS_AT = 8;

/** Visits between each -1 to the payout. */
const FALLOFF_EVERY = 3;

/**
 * @param result  { chordsFound, instrumentsPlayed, notesPlayed } from the session
 * @param visits  how many times this run has been to the rack BEFORE this one
 */
export function scoreRackVisit(result, visits = 0) {
  const chords = result ? result.chordsFound : 0;
  const played = result ? result.instrumentsPlayed : 0;

  let rating = CHORD_TABLE.find((r) => chords >= r.min).rating;
  // Playing all five is a deliberate detour rather than a way to score, so it
  // is worth a point only once you were going to score anyway.
  if (rating > 0 && played >= 5) rating += 1;
  rating = Math.max(0, rating - Math.floor(visits / FALLOFF_EVERY));

  return {
    rating,
    // Not rating — a lead. The next year's draw owes you a placement.
    hotHands: chords >= HOT_HANDS_AT,
    chords,
    played,
  };
}

/** The line the log prints for a year spent at the rack. */
export function rackOutcome({ rating, hotHands, chords }) {
  if (hotHands) return 'You wrote something real.';
  if (chords === 0) return 'You never found it.';
  if (rating === 0) return 'The same ideas, again.';
  return chords >= 5 ? 'The hands got better.' : 'A few ideas landed.';
}
