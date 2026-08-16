/**
 * roster.js — pure content. Game logic never hard-codes against a name.
 *
 * Every encounter asks for a TIER (and optionally a territory / track) and
 * gets a name injected. Swap, localize, or replace this whole file and the
 * mechanics are untouched.
 *
 * All names here are fictional. If you want to ship with real artists,
 * replace the arrays — nothing outside this file needs to change.
 *
 * Entry shape: { name, region, genre }
 *   region: 'US' | 'UK' | 'DE' | 'FR' | 'CA' | 'NG' | 'KR' | 'BR' | 'PR'
 */

export const ROSTER = {
  //  — global icons. A placement here is career-defining.
  tier5_global: [
    { name: 'Bruno Mars', region: 'US', genre: 'pop' },
    { name: 'Justin Bieber', region: 'CA', genre: 'pop' },
    { name: 'The Weeknd', region: 'CA', genre: 'R&B' },
    { name: 'Rema', region: 'NG', genre: 'afrobeats' },
    { name: 'Burna Boy', region: 'NG', genre: 'afrobeats' },
    { name: 'Tame Impala', region: 'US', genre: 'psychedelic rock' },
    { name: 'Rihanna', region: 'US', genre: 'pop' },
    { name: 'Taylor Swift', region: 'US', genre: 'pop' },
    { name: 'SZA', region: 'US', genre: 'R&B' },
    { name: 'Bad Bunny', region: 'PR', genre: 'reggaeton' },
    { name: 'Travis Scott', region: 'US', genre: 'hip-hop' },
    { name: 'Kanye West', region: 'US', genre: 'hip-hop'},
    { name: 'Drake', region: 'CA', genre: 'hip-hop'},
    { name: 'Kendrick Lamar', region: 'US', genre: 'hip-hop'},
    { name: 'Post Malone', region: 'US', genre: 'country'},
    { name: 'Justin Timberlake', region: 'US', genre: 'pop'}, 
  ],

  //  — international stars.
  tier4_international: [
    { name: 'John Doe', region: 'US', genre: 'alt-R&B' },
    { name: 'Don Toliver', region: 'US', genre: 'hip-hop' },
  ],

  //  — nationally known. The tier that gets you in rooms.
  tier3_national: [
    { name: 'John Doe', region: 'US', genre: 'R&B' },
   
  ],

  //  — buzzing, scene-level. Cheap to work with, may go somewhere.
  tier2_rising: [
    { name: 'John Doe', region: 'US', genre: 'alt-pop' },
   
  ],

  //  — unknowns. Also procedurally generatable (see makeLocalName).
  tier1_local: [
    { name: 'John Doe', region: 'US', genre: 'rap' },
   
  ],

  //  — US underground rap. A PARALLEL TRACK, NOT A LOWER TIER.
  // High taste, low relevance, near-zero cash. The Architect route.
  underground_us: [
    { name: 'John Doe', region: 'US', genre: 'abstract rap' },
   
  ],

  // ~10 slots — the film scoring track.
  directors: [
    { name: 'John Doe', region: 'US', genre: 'prestige drama' },
    
  ],
};

/**
 * The roster's `genre` field is flavor text (94 distinct tags, many invented
 * for this game — "tape rap", "plunderphonics rap", etc). Billboard does not
 * run a chart for each of those. This maps every tag down into the small set
 * of chart categories Billboard actually publishes, so "Billboard #1
 * Producer" trophies stay plausible.
 */
const GENRE_TO_CHART = {
  'MPB': 'Latin',
  'R&B': 'R&B/Soul',
  'UK rap': 'Hip-Hop/Rap',
  'abstract rap': 'Hip-Hop/Rap',
  'abstract soul': 'R&B/Soul',
  'afro-fusion': 'Afrobeats',
  'afrobeats': 'Afrobeats',
  'alt': 'Indie/Alternative',
  'alt-R&B': 'R&B/Soul',
  'alt-pop': 'Pop',
  'alté': 'Afrobeats',
  'ambient rap': 'Hip-Hop/Rap',
  'americana': 'Country/Americana',
  'art-pop': 'Pop',
  'baile-pop': 'Latin',
  'bedroom pop': 'Pop',
  'bedroom rap': 'Hip-Hop/Rap',
  'blockbuster': 'Film Score',
  'blues rock': 'Rock',
  'boom bap': 'Hip-Hop/Rap',
  'chanson-pop': 'Pop',
  'cloud rap': 'Hip-Hop/Rap',
  'cold thriller': 'Film Score',
  'collective': 'Indie/Alternative',
  'coming-of-age': 'Film Score',
  'country': 'Country/Americana',
  'crime': 'Film Score',
  'dance-pop': 'Electronic/Dance',
  'disco-funk': 'R&B/Soul',
  'documentary': 'Film Score',
  'drill': 'Hip-Hop/Rap',
  'duo': 'Indie/Alternative',
  'electro-pop': 'Electronic/Dance',
  'electronic': 'Electronic/Dance',
  'emo': 'Rock',
  'experimental': 'Indie/Alternative',
  'experimental rap': 'Hip-Hop/Rap',
  'folk': 'Country/Americana',
  'folk-pop': 'Country/Americana',
  'funk': 'R&B/Soul',
  'garage': 'Electronic/Dance',
  'garage rock': 'Rock',
  'gospel': 'Gospel/Christian',
  'gospel rap': 'Gospel/Christian',
  'gospel-soul': 'Gospel/Christian',
  'grime': 'Hip-Hop/Rap',
  'hardcore': 'Rock',
  'historical epic': 'Film Score',
  'horrorcore': 'Hip-Hop/Rap',
  'house': 'Electronic/Dance',
  'hyperpop': 'Electronic/Dance',
  'indie': 'Indie/Alternative',
  'indie rock': 'Indie/Alternative',
  'indie-pop': 'Indie/Alternative',
  'industrial': 'Electronic/Dance',
  'industrial rap': 'Hip-Hop/Rap',
  'jazz rap': 'Hip-Hop/Rap',
  'jazz-pop': 'Jazz',
  'jungle': 'Electronic/Dance',
  'latin': 'Latin',
  'latin-pop': 'Latin',
  'lo-fi': 'Indie/Alternative',
  'lo-fi rap': 'Hip-Hop/Rap',
  'minimal': 'Electronic/Dance',
  'noise': 'Indie/Alternative',
  'noise rap': 'Hip-Hop/Rap',
  'nu-disco': 'Electronic/Dance',
  'plunderphonics rap': 'Hip-Hop/Rap',
  'poetry rap': 'Hip-Hop/Rap',
  'pop': 'Pop',
  'pop-punk': 'Rock',
  'pop-rap': 'Hip-Hop/Rap',
  'prestige drama': 'Film Score',
  'psychological horror': 'Film Score',
  'rap': 'Hip-Hop/Rap',
  'reggaetón': 'Latin',
  'regional': 'Latin',
  'rock': 'Rock',
  'sci-fi': 'Film Score',
  'shoegaze': 'Indie/Alternative',
  'singer-songwriter': 'Country/Americana',
  'slow cinema': 'Film Score',
  'soul': 'R&B/Soul',
  'soul-sample rap': 'Hip-Hop/Rap',
  'southern': 'Hip-Hop/Rap',
  'spoken word': 'Hip-Hop/Rap',
  'stadium rock': 'Rock',
  'synthpop': 'Electronic/Dance',
  'tape rap': 'Hip-Hop/Rap',
  'techno': 'Electronic/Dance',
  'trap': 'Hip-Hop/Rap',
  'trip-hop': 'Electronic/Dance',
  'unsigned': 'Indie/Alternative',
  'urbano': 'Latin',
};

/** The chart categories Billboard actually runs — one "Billboard #1 Producer" trophy each. */
export const BILLBOARD_CHARTS = [...new Set(Object.values(GENRE_TO_CHART))].sort();

/** artist name -> Billboard chart category, for crediting a placement toward its trophy. */
export const NAME_TO_CHART = new Map(
  Object.values(ROSTER).flat().map((a) => [a.name, GENRE_TO_CHART[a.genre] || 'Indie/Alternative'])
);

/** Human-readable descriptor used when a card wants a tier, not a name. */
export const TIER_DESCRIPTOR = {
  tier1_local: 'a kid from two neighborhoods over',
  tier2_rising: 'an artist with a little heat',
  tier3_national: 'an artist you have heard on the radio',
  tier4_international: 'an artist who plays arenas',
  tier5_global: 'one of the biggest artists alive',
  underground_us: 'a rapper nobody your age has heard of',
  directors: 'a director',
};

export const TIER_KEY_BY_LEVEL = {
  1: 'tier1_local',
  2: 'tier2_rising',
  3: 'tier3_national',
  4: 'tier4_international',
  5: 'tier5_global',
};

export const TERRITORY_NAME = {
  US: 'the States',
  UK: 'the UK',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  NG: 'Nigeria',
  KR: 'South Korea',
  BR: 'Brazil',
  PR: 'Puerto Rico',
};

/**
 * Territories unlock as you climb the fame ladder.
 * Value = minimum status tier index (see engine/status.js) required.
 *   1 BEDROOM · 2 LOCAL · 3 KNOWN · 4 NATIONAL · 5 INTERNATIONAL · 6 LEGENDARY
 */
export const TERRITORY_UNLOCK = {
  US: 1,
  UK: 3,
  DE: 4,
  FR: 4,
  CA: 4,
  NG: 5,
  KR: 5,
  BR: 5,
  PR: 5,
};

/* --- procedural filler for tier1_local, so the bottom never runs dry --- */
const FIRST = ['Dre', 'Kayla', 'Marco', 'Tayshaun', 'Elena', 'Petey', 'June', 'Omar', 'Britt', 'Cash', 'Neveah', 'Slim', 'Roddy', 'Winnie', 'Zeke'];
const LAST = ['from work', 'from the lot', 'with the van', 'in 4B', "who owes you $40", 'from church', 'from the smoke shop', 'from third period'];

export function makeLocalName(rand) {
  const a = FIRST[Math.floor(rand() * FIRST.length)];
  const b = LAST[Math.floor(rand() * LAST.length)];
  return { name: `${a} ${b}`, region: 'US', genre: 'unsigned' };
}
