/** Deterministic seeded RNG. Same seed + same choices = same run. */

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A fresh seed for every run. There is no daily seed and no seed input —
 * you hop on whenever you want and the deck is yours alone. The seed still
 * exists internally so a single run's draws are reproducible while it plays;
 * it is never shown to the player.
 */
export function newSeed() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function weightedPick(items, rand, weightOf = (i) => i.weight || 1) {
  const total = items.reduce((a, i) => a + weightOf(i), 0);
  if (total <= 0) return items[0];
  let r = rand() * total;
  for (const i of items) {
    r -= weightOf(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}
