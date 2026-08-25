/**
 * rating.js — the OVERALL RATING. The only number in the game.
 *
 * There are no hidden stats any more. There is no Skill, no Taste, no
 * Relevance, no Connections. A card is worth a whole number of rating points,
 * a lane is worth a whole number of rating points, and the rating only ever
 * moves in whole numbers. What the player sees is the entire model.
 *
 * Lives in its own module because both the turn engine and the fame ladder
 * need it, and having them import each other would be a circular dependency.
 */

/* ---- the talent roll ---------------------------------------------- */

export const TALENT_MIN = 46;
export const TALENT_MAX = 75;

/** At or above this you are a PRODIGY: rare air, and it does not always last. */
export const PRODIGY_AT = 70;

/** At or below this the world owes you a favour — see the `underdog` flag. */
export const UNDERDOG_AT = 55;

export function rollTalent(rand) {
  return TALENT_MIN + Math.floor(rand() * (TALENT_MAX - TALENT_MIN + 1));
}

/* ---- growth -------------------------------------------------------- */

/** A prodigy improves faster — until the day they stop. */
export const PRODIGY_GROWTH = 1.55;
export const PLATEAU_GROWTH = 0.45;
export const NORMAL_GROWTH = 1.0;

/** Odds per YEAR that a prodigy levels off. ~50% across a full career. */
export const PLATEAU_CHANCE = 0.022;
/** No plateau before this turn — a prodigy at least gets their teens. */
export const PLATEAU_FROM_TURN = 4;

export function growthMultiplier(s) {
  if (s.plateaued) return PLATEAU_GROWTH;
  return s.prodigy ? PRODIGY_GROWTH : NORMAL_GROWTH;
}

/**
 * The last points are the hardest. Without this a prodigy walks to 99 by
 * thirty and the back half of the run has nothing left to offer.
 *
 * The floor used to be 0.10 against a /82 curve, which squeezed too hard too
 * early: at OVR 73 a +3 year became +0, so the middle of every career was a
 * flat line. This curve is gentler and keeps ordinary years moving by 1 or 2
 * into the high seventies, but the floor still has to bite — at 0.30 every
 * strategy walked to 99 and the median career finished at 87. The ceiling is
 * held instead by JUMPS being exempt from it — see applyRating — so the way to
 * the top is a rare opportunity that actually lands, not grinding filler years.
 */
export function ratingScale(current) {
  return Math.max(0.16, 1 - current / 104);
}

/**
 * Apply a whole number of rating points.
 *
 * Gains are amplified by the prodigy/plateau multiplier and damped by the
 * ceiling, then rounded — so the number on screen never moves by a fraction.
 * Losses land at face value: nothing protects you on the way down.
 */
export function applyRating(s, points) {
  if (!points) return 0;
  // No floor. A turn is one year now, and a year that moves the number by
  // nothing is an ordinary thing in a career — the log has a line for it.
  const moved = Math.round(points * (points > 0 ? growthMultiplier(s) * ratingScale(s.rating) : 1));
  const before = s.rating;
  s.rating = Math.max(0, Math.min(99, s.rating + moved));
  return s.rating - before;
}

/* ---- reading it ---------------------------------------------------- */

export function overallRating(s) {
  return s.rating;
}

export function ratingTier(r) {
  if (r >= 90) return 'GENERATIONAL';
  if (r >= 80) return 'ELITE';
  if (r >= 70) return 'ESTABLISHED';
  if (r >= 60) return 'SOLID';
  if (r >= 45) return 'DEVELOPING';
  if (r >= 30) return 'RAW';
  return 'UNPROVEN';
}
