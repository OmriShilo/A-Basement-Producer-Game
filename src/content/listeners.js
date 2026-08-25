/**
 * listeners.js — monthly listeners, as the game's unit of how big somebody is.
 *
 * The credits list used to print the internal tier number, which is a designer's
 * word for a thing the player already understands in a different unit. "TIER 3"
 * means nothing at a glance; "4.2M monthly" places somebody instantly.
 *
 * WHERE THESE COME FROM
 *
 * Real Spotify monthly-listener figures, captured 2026-08-26. 123 of them were
 * read off kworb.net's top-artists-by-monthly-listeners tables (which run to
 * about 25,000 artists, bottoming out around 500K); the dozen artists who sit
 * below that floor were looked up one at a time.
 *
 * THEY ARE A SNAPSHOT AND THEY WILL GO STALE. Monthly listeners move every day
 * and some of these artists are moving fast. Nothing in the game reads these
 * numbers — tier alone drives every mechanic — so a figure drifting out of date
 * costs display accuracy and nothing else. To refresh, re-scrape the same
 * tables and regenerate this block.
 *
 * A name that is not in this table (the procedurally generated local artists,
 * or anyone added to the roster later) falls back to a tier-derived estimate,
 * so the display never has a hole in it.
 */

/** Real figures, captured 2026-08-26. See the note above before trusting them. */
export const MONTHLY_LISTENERS = {
  /* TIER 5 — global */
  'Taylor Swift': 100374178,
  'Drake': 94431723,
  'Bad Bunny': 99413216,
  'The Weeknd': 115236095,
  'Beyoncé': 65063566,
  'Rihanna': 114598818,
  'Kendrick Lamar': 67986452,
  'Kanye West': 69619043,
  'Bruno Mars': 132513904,
  'Justin Bieber': 120884736,
  'Ariana Grande': 100597578,
  'Billie Eilish': 78680160,
  'Ed Sheeran': 81047217,
  'Adele': 58870424,
  'Dua Lipa': 68961795,
  'Harry Styles': 65082666,
  'SZA': 65451387,
  'Travis Scott': 59647165,
  'Post Malone': 69037207,
  'Lady Gaga': 97768969,
  'Eminem': 73092968,
  'JAY-Z': 48598737,
  'Tyler, The Creator': 38012248,
  'Doja Cat': 55547764,
  'Olivia Rodrigo': 65899233,
  'Sabrina Carpenter': 56797238,
  'BTS': 35309274,
  'BLACKPINK': 19948860,
  'Burna Boy': 56709088,
  'Karol G': 60991199,

  /* TIER 4 — international */
  'Don Toliver': 42504745,
  'Yeat': 16243141,
  'Ken Carson': 6567926,
  'Destroy Lonely': 4013877,
  'SoFaygo': 2398806,
  'Playboi Carti': 40121095,
  'Future': 52856139,
  'Metro Boomin': 41857837,
  'Young Thug': 28779248,
  '21 Savage': 40713960,
  'Lil Baby': 31457564,
  'Gunna': 33337182,
  'Nicki Minaj': 46932381,
  'Cardi B': 32447686,
  'Frank Ocean': 38723911,
  'Lana Del Rey': 64296172,
  'Central Cee': 22218740,
  'Dave': 31636638,
  'Stormzy': 8244475,
  'Fred again..': 23750521,
  'Rosalía': 26827241,
  'Wizkid': 17001130,
  'Rema': 26571660,
  'Tems': 36173798,
  'Tyla': 28269267,
  'NewJeans': 13823458,
  'Stray Kids': 10940227,
  'Anitta': 39259057,
  'Rauw Alejandro': 53201388,
  'PARTYNEXTDOOR': 27625354,

  /* TIER 3 — national */
  'Brent Faiyaz': 23077288,
  'Summer Walker': 18590288,
  'Jhené Aiko': 13200975,
  'Giveon': 24234444,
  'Steve Lacy': 34412068,
  'Ravyn Lenae': 33136858,
  'Amaarae': 4903106,
  'JID': 16310493,
  'Apache 207': 3858041,
  'Denzel Curry': 7385461,
  'Vince Staples': 3835761,
  'Freddie Gibbs': 3696352,
  'Westside Gunn': 2667418,
  'Ninho': 8354544,
  'Smino': 3660364,
  'Saba': 807485,
  'Noname': 459400,
  'Little Simz': 4520816,
  'Sampha': 2597555,
  'Jorja Smith': 12829722,
  'Cleo Sol': 3992126,
  'Arlo Parks': 1532962,
  'beabadoobee': 24659549,
  'Fontaines D.C.': 7861680,
  'Turnstile': 2373090,

  /* TIER 2 — rising */
  'Veeze': 2439042,
  'BossMan Dlow': 5409391,
  'Cash Cobain': 3531201,
  'Ice Spice': 12623013,
  'Sexyy Red': 17455922,
  'GloRilla': 15100775,
  'Latto': 15616758,
  'Doechii': 24573119,
  'Flo Milli': 12539517,
  'PinkPantheress': 30668295,
  'Nemzzz': 6847529,
  'Fimiguerrero': 2273864,
  'Lola Young': 23166911,
  'Chase Shakur': 904296,
  '4batz': 2889116,
  'Leon Thomas': 14321002,
  'Malcolm Todd': 38967621,
  'Mk.gee': 1548425,
  'Kevin Abstract': 1335090,
  'Faye Webster': 7743263,

  /* TIER 1 — local */
  'Anycia': 380800,
  'TiaCorine': 1577760,
  'Bktherula': 2218978,
  'Kenzo Balla': 113500,
  'Lay Bankz': 2280786,
  'Nourished by Time': 449359,
  'Deb Never': 224600,
  'Wallice': 127500,
  'Jane Remover': 974252,
  'LSDXOXO': 196600,
  'Rachel Chinouriri': 3654624,
  'Odeal': 6150407,
  'Nia Archives': 1926418,
  'Sammy Virji': 4642974,
  'Debbie': 503660,

  /* UNDERGROUND */
  '2hollis': 5081981,
  'slayr': 1700000,
  'Nettspend': 1581380,
  'xaviersobased': 1166940,
  'osamason': 1857657,
  'che': 1263022,
  'Kamiyada+': 182300,
  'Yhapojj': 221600,
  'Autumn!': 1059074,
  'Sematary': 1191395,
  'LUCKI': 6951704,
  'MIKE': 2096657,
  'Navy Blue': 314800,
  'billy woods': 274100,
  'redveil': 684030,
};

/* ------------------------------------------------------------------ */
/* FALLBACK — for names with no real figure                            */
/* ------------------------------------------------------------------ */

/**
 * Plausible bands per tier, sampled log-uniformly so the spread within a band
 * looks like a real distribution rather than an even scatter. Only ever used
 * for names absent from the table above.
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
  const real = MONTHLY_LISTENERS[name];
  if (real !== undefined) return real;
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
