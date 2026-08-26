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

/* ------------------------------------------------------------------ */
/* THE ARC — rise, prime, decline                                      */
/* ------------------------------------------------------------------ */

/**
 * A career is not a running total, it is a shape: a steep climb through your
 * twenties, a long prime where the number barely moves, and a decline. The old
 * model had no shape at all — every year was worth the same fixed fraction of
 * whatever the cards paid, so runs meandered instead of arcing, and the only
 * thing separating a good career from a bad one was how many good cards it drew.
 *
 * Two things produce the shape now.
 *
 * POTENTIAL is a ceiling rolled once per run and never shown. Growth is
 * proportional to how far below it you are, so a 50 chasing an 88 climbs in
 * fives and sixes, and the same player at 86 gains one at a time and then
 * stops. That is what makes the plateau a plateau rather than a soft cap you
 * grind through, and it is why two runs with identical cards can peak twenty
 * points apart.
 *
 * AGE scales the whole thing down as you get older. You improve fastest before
 * twenty-five, and after thirty-four almost nothing you do raises the number —
 * by then the game is about holding on to it.
 */

/**
 * The ceiling you START with. Never shown. It is no longer the ceiling you are
 * stuck with — see applyRecognition, which raises it when the evidence of what
 * you have done outgrows it.
 */
export function rollPotential(talent, prodigy, rand) {
  /* Was 70..95. Lowered because gambles no longer take permanent rating off
     you: careers now reach their ceiling far more reliably, so the ceiling
     itself had to come down to keep the median career from finishing elite. */
  const base = 65 + Math.floor(rand() * 26);       // 65..90
  const p = Math.max(base, talent + 10) + (prodigy ? 4 : 0);
  return Math.min(99, p);
}

/** How much of the climb is left, as a multiplier on everything you earn. */
export function growthRoom(s) {
  const room = s.potential - s.rating;
  if (room <= 0) return 0.08;                       // at your ceiling: near nothing
  return Math.min(2.6, Math.max(0.18, room / 9));
}

/** You improve fastest young. After 34 the number is something you defend. */
export function ageFactor(age) {
  if (age <= 24) return 1;
  if (age >= 34) return 0.30;
  return 1 - ((age - 24) / 10) * 0.70;
}

export function ratingScale(s) {
  return growthRoom(s) * ageFactor(s.age);
}

/**
 * Losses are damped too, but only half as much as gains.
 *
 * They used to land at face value while gains were taxed, which meant a -6 cost
 * six and a +6 earned one. That reads as the game punishing you three times
 * harder than it pays you. Halfway is the honest place to land: the world still
 * takes it back faster than it hands it over, but not by a factor of three.
 *
 * Deliberately NOT proportional to remaining room — being near your ceiling
 * should not armour you. A bad year at your peak is exactly when it hurts.
 */
export function lossScale(s) {
  return (1 + Math.min(1, growthRoom(s))) / 2;
}

/**
 * Jumps are the big moments — the first real credit, a plaque, a session that
 * changes everything — and they land at full face value for the whole climb.
 * They only resist inside the last few points of your ceiling, where they would
 * otherwise erase the difference between a good career and a great one.
 */
export function jumpScale(s) {
  const room = s.potential - s.rating;
  if (room >= 8) return 1;
  if (room <= 0) return 0.15;
  return 0.15 + (room / 8) * 0.85;
}

/**
 * Apply a whole number of rating points.
 *
 * Everything is rounded, so the number on screen never moves by a fraction.
 */
export function applyRating(s, points) {
  if (!points) return 0;
  const factor = points > 0
    ? growthMultiplier(s) * ratingScale(s)
    : lossScale(s);
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
  const moved = points > 0 ? Math.round(points * jumpScale(s)) : points;
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


/* ------------------------------------------------------------------ */
/* FORM — temporary OVERALL                                            */
/* ------------------------------------------------------------------ */

/**
 * The rating is two numbers now: what you have permanently built, and what you
 * are carrying this season.
 *
 * Gambles move the temporary one. A bet that comes off is not a career, it is a
 * good few months — so it pays +1 to +3 of FORM, and a bet that misses costs 1
 * or 2 of it. That is the fix for gambles feeling brutal: losing three in a row
 * used to strip fifteen points of career off you permanently, when what actually
 * happened is you had a bad couple of years.
 *
 * Form is not free, though, and it is not permanent by default:
 *
 *   A GOOD YEAR BANKS IT. Land a credit, a plaque or an award and everything
 *   you are carrying converts into permanent rating. Form is the game asking
 *   whether you can turn a hot streak into something real before it fades.
 *
 *   A QUIET YEAR BLEEDS IT. Nothing lands, and form drains a point a year back
 *   toward zero. Sitting on a good bet does not keep it.
 *
 *   AGE DOES NOT TOUCH IT. Decay comes off permanent rating only, so an older
 *   producer can still have a hot year — they just cannot stop the base
 *   eroding underneath it. That is what getting old looks like from inside.
 */

/** Form cannot run away with the game in either direction. */
export const TEMP_MAX = 8;
export const TEMP_MIN = -6;

/** Add or remove form. Returns the actual movement after clamping. */
export function applyTemp(s, points) {
  if (!points) return 0;
  const before = s.temp;
  s.temp = Math.max(TEMP_MIN, Math.min(TEMP_MAX, s.temp + points));
  return s.temp - before;
}

/**
 * End of year. `banked` is whether anything real landed — a credit, a plaque,
 * an award.
 *
 * Returns what was converted into permanent rating, which is 0 on a quiet year.
 *
 * Banking is ONE FOR ONE — three points of form become three points of rating.
 * It ran through applyRating at first, which meant the growth curve amplified
 * it: +3 form banked at nineteen came out as +8 permanent, and the median
 * career jumped five points. It also made the mechanic unreadable, because the
 * number you were carrying was not the number you got. It goes through
 * applyJump instead, so the very top of the scale still resists and nothing
 * else does.
 */
export function settleTemp(s, banked) {
  if (banked) {
    // A good year washes out a bad bet as well as banking a good one — you
    // delivered, and nobody is still counting the miss.
    if (s.temp <= 0) { s.temp = 0; return 0; }
    const gained = applyJump(s, s.temp);
    s.temp = 0;
    return gained;
  }
  // Nothing landed. Form bleeds back toward zero a point at a time.
  if (s.temp > 0) s.temp -= 1;
  else if (s.temp < 0) s.temp += 1;
  return 0;
}

/** What the player sees: what you built, plus what you are carrying. */
export function shownRating(s) {
  return Math.max(0, Math.min(99, s.rating + s.temp));
}


/* ------------------------------------------------------------------ */
/* RECOGNITION — the ceiling has to answer to the evidence             */
/* ------------------------------------------------------------------ */

/**
 * Potential was rolled once and never moved, which meant the game could decide
 * you were a 77 before you had played a note and then refuse to notice you
 * became a superstar. Runs peaking over a billion annual streams were
 * finishing as low as 48. A producer doing 2.8B a year is not a 77 — there is
 * no reading of the world in which they are.
 *
 * So the roll is now a STARTING ceiling, not a permanent one. What you have
 * actually done sets a floor underneath the rating, and the ceiling ratchets up
 * to stay above it. The roll still decides how far talent alone carries you;
 * evidence decides the rest, and evidence wins.
 *
 * Streams are the honest measure because they cannot be faked by the model —
 * they are the sum of every real placement you ever landed, decayed. Plaques
 * and a Grammy are their own proof and set floors of their own.
 */
export function earnedFloor(s) {
  let f = 0;
  const peak = s.peakStreams || 0;
  if (peak >= 1_000_000) {
    /* Steep on purpose. A gentler curve (50 + 13*log10) floored almost every
       career, because a working producer's catalogue does hundreds of millions
       a year quite normally — the median run finished at 85 and the number
       stopped meaning anything. This one leaves the middle of the field alone
       and only bites where the evidence is genuinely undeniable.
       Anchored to what a career can actually post now that a record's first
       year is a realistic multiple of its artist's audience: the median run
       peaks around 140M and the very best clear a billion, so those are the
       two ends the OVR scale has to span.
         50M -> 62,  140M -> 74,  400M -> 85,  1B -> 95 */
    f = Math.max(f, 18.5 + 25.5 * Math.log10(peak / 1_000_000));
  }
  if (s.certs.diamond) f = Math.max(f, 92);
  else if (s.certs.multi) f = Math.max(f, 84);
  else if (s.certs.platinum) f = Math.max(f, 74);
  else if (s.certs.gold) f = Math.max(f, 66);

  /* Awards are deliberately NOT in here, though they look like the obvious
     evidence. Grammy eligibility is gated on the rating, so letting a win
     raise the rating closes a loop: recognition lifts you over the gate, the
     nomination arrives, the win floors you higher, and round again. Adding
     them took a third of all runs to a floor of 90. Streams and plaques both
     come from placements rather than from the rating, so they can be evidence
     for it without feeding themselves. Awards still pay their jump. */

  // Past forty the floor itself gives way, about a point and a half a year, so
  // a legend still declines — from a legend's height rather than to nothing.
  const years = Math.max(0, s.age - 40);
  return Math.min(99, Math.round(f * (1 - years * 0.015)));
}

/**
 * Apply the evidence. Called once a year, after the year's streams and plaques
 * are in.
 *
 * The correction is immediate rather than gradual on purpose: if this year you
 * did two billion streams, you are elite THIS year, and making you climb to it
 * over the following decade at an age-damped rate is the bug being fixed.
 */
export function applyRecognition(s) {
  const floor = earnedFloor(s);
  if (floor > s.potential) s.potential = Math.min(99, floor + 3);
  if (floor > s.rating) {
    const before = s.rating;
    s.rating = floor;
    return s.rating - before;
  }
  return 0;
}

/* ---- reading it ---------------------------------------------------- */

export function overallRating(s) {
  return shownRating(s);
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
