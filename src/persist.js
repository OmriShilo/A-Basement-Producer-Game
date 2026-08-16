import { emptyCabinet } from './engine/game.js';

const KEY = 'basement-producer.cabinet.v1';

export function loadCabinet() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyCabinet();
    const parsed = JSON.parse(raw);
    return { ...emptyCabinet(), ...parsed, certs: { ...emptyCabinet().certs, ...(parsed.certs || {}) } };
  } catch {
    return emptyCabinet();
  }
}

export function saveCabinet(c) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* private browsing, quota, whatever — the run still finishes */
  }
}

export function wipeCabinet() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
  return emptyCabinet();
}
