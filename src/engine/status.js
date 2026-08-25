/**
 * status.js — what little is left of "standing".
 *
 * There is no fame ladder any more. There are no producer tiers, nothing to
 * be promoted or demoted from, and nothing gated behind a tier. The OVERALL
 * RATING is the only system in the game.
 *
 * BEDROOM PRODUCER survives as the name of the thing you are — a gimmick and
 * a title, printed on the screen and never computed against.
 */

export const STANDING = 'BEDROOM PRODUCER';

export function majorAwardCount(a) {
  return a.grammyWins + a.oscarWins + a.emmyWins;
}

/**
 * The parallel route: a wall of underground credits rather than hits.
 *
 * Threshold was 6, set against a deck that had far more underground cards in
 * it. The rebuilt deck carries two, so 6 put this permanently out of reach —
 * 0 runs in 4,000. Four is reachable off the repeatable tape card without
 * being something you fall into.
 */
export function isArchitect(s) {
  return s.undergroundCount >= 4 && s.rating >= 84;
}
