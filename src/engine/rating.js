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

/* Below this, every point you earn is a point you get. */
export const FULL_VALUE_BELOW = 60;
/* Where the taper bottoms out. */
export const TOP_BAND = 90;
export const TOP_SCALE = 0.16;

/* Jumps keep their full size right up to here — this is the band they exist
   for, carrying a career from ordinary to serious in one year. */
export const JUMP_FULL_BELOW = 80;

/**
 * The very top of the scale is hard for everybody, jumps included.
 *
 * Jumps deliberately bypass the ordinary taper, which is what makes a big
 * opportunity feel like one. But left completely unscaled they became the whole
 * game: certifications and milestones alone paid about +26 a run, every
 * strategy coasted to 99, and the tenth-percentile career finished at 91. A
 * jump is still worth its full face value for the entire climb; it is only the
 * last stretch above JUMP_FULL_BELOW that resists, and even there it resists
 * far less than ordinary points do.
 */
export function jumpScale(current) {
  if (current <= JUMP_FULL_BELOW) return 1;
  const t = Math.min(1, (current - JUMP_FULL_BELOW) / (99 - JUMP_FULL_BELOW));
  return 1 - t * 0.8;
}

/**
 * The last points are the hardest — but only the last ones.
 *
 * This was a single curve over the whole range (`1 - current/104`), which meant
 * a gain was being shaved from the very first year: at OVR 60 a +4 landed as
 * +2, at 80 a +6 landed as +1. Losses were never scaled, so the game quietly
 * paid out three lost gambles at −6/−5/−3 in full and then handed back +1 for
 * a placement. That asymmetry is what made the number feel like it only ever
 * went down.
 *
 * Now nothing is damped at all below FULL_VALUE_BELOW, the taper runs from
 * there to TOP_BAND, and only the top of the scale is genuinely hard. The
 * ceiling is held by how rarely the big cards come up, not by taxing every
 * ordinary year.
 */
export function ratingScale(current) {
  if (current <= FULL_VALUE_BELOW) return 1;
  const t = Math.min(1, (current - FULL_VALUE_BELOW) / (TOP_BAND - FULL_VALUE_BELOW));
  return 1 - t * (1 - TOP_SCALE);
}

/**
 * Losses are damped too, but only half as much as gains.
 *
 * They used to land at face value while gains were taxed by the full taper,
 * which at OVR 85 meant a −6 cost you six and a +6 earned you two. That reads
 * as the game punishing you three times harder than it pays you, and it is the
 * single reason the number felt like it only went down.
 *
 * Halfway is the honest place to land: the world still takes it back faster
 * than it hands it over — which is true, and which keeps a bad year frightening
 * — but not by a factor of three.
 */
export function lossScale(current) {
  return (1 + ratingScale(current)) / 2;
}

/**
 * Apply a whole number of rating points.
 *
 * Gains are amplified by the prodigy/plateau multiplier and damped by the
 * ceiling; losses are damped on the gentler curve above. Everything is rounded,
 * so the number on screen never moves by a fraction.
 */
export function applyRating(s, points) {
  if (!points) return 0;
  // No floor. A turn is one year now, and a year that moves the number by
  // nothing is an ordinary thing in a career — the log has a line for it.
  const factor = points > 0
    ? growthMultiplier(s) * ratingScale(s.rating)
    : lossScale(s.rating);
  const moved = Math.round(points * factor);
  const before = s.rating;
  s.rating = Math.max(0, Math.min(99, s.rating + moved));
  return s.rating - before;
}

/* ---- the milestones ------------------------------------------------ */

/**
 * THE FIRST ONE. The single biggest moment in a producer's career is the first
 * credit that is actually big, and the game should say so in the only unit it
 * has. Paid once per run, as a jump, so it lands at full size no matter how
 * high the rating already is — and sized by how big that first one was.
 *
 * Tiers 1 and 2 are not in here on purpose: everybody's first credit is small,
 * and paying a milestone for it would spend the moment on a mixtape nobody
 * heard.
 */
export const FIRST_BIG_JUMP = { 3: 4, 4: 6, 5: 9 };

/** Apply a jump: full face value for the climb, resisted only at the very top. */
export function applyJump(s, points) {
  if (!points) return 0;
  const before = s.rating;
  const moved = points > 0 ? Math.round(points * jumpScale(s.rating)) : points;
  s.rating = Math.max(0, Math.min(99, s.rating + moved));
  return s.rating - before;
}

/**
 * A plaque on the wall. These were ordinary `rating` points (1/2/3/5) and so
 * were shaved by the taper exactly when you were finally earning them — a gold
 * record at OVR 85 moved the number by nothing. They are jumps now, and they
 * are the reliable way up the back half of the scale: land credits, get them
 * certified, watch it move.
 */
export const CERT_JUMP = { gold: 1, platinum: 2, multi: 4, diamond: 8 };

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
