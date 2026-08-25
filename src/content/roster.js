/**
 * roster.js — pure content. Game logic never hard-codes against a name.
 *
 * Every encounter asks for a TIER (and optionally a territory / track) and
 * gets a name injected. Swap, localize, or replace this whole file and the
 * mechanics are untouched.
 *
 * These are REAL artists and directors, spelled as they style themselves.
 * Putting real people in a game as characters is a rights question — see the
 * "before any public launch" section of the README. Nothing outside this file
 * needs to change if you swap them back out.
 *
 * Entry shape: { name, region, genre }
 *   region: see TERRITORY_NAME below
 */
import { listenersFor } from './listeners.js';


export const ROSTER = {
  // 30 slots — global icons. A placement here is career-defining.
  tier5_global: [
    { name: 'Bruno Mars', region: 'US', genre: 'pop' },
    { name: 'Justin Bieber', region: 'CA', genre: 'pop' },
    { name: 'The Weeknd', region: 'CA', genre: 'R&B' },
    { name: 'Rihanna', region: 'US', genre: 'pop' },
    { name: 'Ariana Grande', region: 'US', genre: 'pop' },
    { name: 'Taylor Swift', region: 'US', genre: 'pop' },
    { name: 'Bad Bunny', region: 'PR', genre: 'reggaeton' },
    { name: 'Lady Gaga', region: 'US', genre: 'pop' },
    { name: 'Drake', region: 'CA', genre: 'hip-hop' },
    { name: 'Ed Sheeran', region: 'UK', genre: 'pop' },
    { name: 'Billie Eilish', region: 'US', genre: 'alt-pop' },
    { name: 'Eminem', region: 'US', genre: 'hip-hop' },
    { name: 'Kanye West', region: 'US', genre: 'hip-hop' },
    { name: 'Post Malone', region: 'US', genre: 'country' },
    { name: 'Dua Lipa', region: 'UK', genre: 'dance-pop' },
    { name: 'Kendrick Lamar', region: 'US', genre: 'hip-hop' },
    { name: 'Olivia Rodrigo', region: 'US', genre: 'alt-pop' },
    { name: 'SZA', region: 'US', genre: 'R&B' },
    { name: 'Harry Styles', region: 'UK', genre: 'pop' },
    { name: 'Beyoncé', region: 'US', genre: 'R&B' },
    { name: 'Lana Del Rey', region: 'US', genre: 'alt-pop' },
    { name: 'Karol G', region: 'CO', genre: 'reggaeton' },
    { name: 'Travis Scott', region: 'US', genre: 'hip-hop' },
    { name: 'Adele', region: 'UK', genre: 'soul' },
    { name: 'Sabrina Carpenter', region: 'US', genre: 'pop' },
    { name: 'Burna Boy', region: 'NG', genre: 'afrobeats' },
    { name: 'Doja Cat', region: 'US', genre: 'pop' },
    { name: 'Rauw Alejandro', region: 'PR', genre: 'reggaeton' },
    { name: 'Future', region: 'US', genre: 'trap' },
    { name: 'JAY-Z', region: 'US', genre: 'hip-hop' },
  ],

  // 30 slots — the second-best tier. International stars.
  tier4_international: [
    { name: 'Nicki Minaj', region: 'US', genre: 'hip-hop' },
    { name: 'Don Toliver', region: 'US', genre: 'hip-hop' },
    { name: 'Metro Boomin', region: 'US', genre: 'trap' },
    { name: '21 Savage', region: 'US', genre: 'trap' },
    { name: 'Playboi Carti', region: 'US', genre: 'rage' },
    { name: 'Anitta', region: 'BR', genre: 'baile-pop' },
    { name: 'Malcolm Todd', region: 'US', genre: 'indie-pop' },
    { name: 'Frank Ocean', region: 'US', genre: 'alt-R&B' },
    { name: 'Tyler, The Creator', region: 'US', genre: 'hip-hop' },
    { name: 'Tems', region: 'NG', genre: 'alt-R&B' },
    { name: 'BTS', region: 'KR', genre: 'K-pop' },
    { name: 'Steve Lacy', region: 'US', genre: 'alt-R&B' },
    { name: 'Gunna', region: 'US', genre: 'trap' },
    { name: 'Ravyn Lenae', region: 'US', genre: 'alt-R&B' },
    { name: 'Cardi B', region: 'US', genre: 'hip-hop' },
    { name: 'Dave', region: 'UK', genre: 'UK rap' },
    { name: 'Lil Baby', region: 'US', genre: 'trap' },
    { name: 'PinkPantheress', region: 'UK', genre: 'hyperpop' },
    { name: 'Young Thug', region: 'US', genre: 'trap' },
    { name: 'Tyla', region: 'ZA', genre: 'amapiano' },
    { name: 'PARTYNEXTDOOR', region: 'CA', genre: 'alt-R&B' },
    { name: 'Rosalía', region: 'ES', genre: 'latin' },
    { name: 'Rema', region: 'NG', genre: 'afrobeats' },
    { name: 'beabadoobee', region: 'UK', genre: 'indie' },
    { name: 'Doechii', region: 'US', genre: 'rap' },
    { name: 'Giveon', region: 'US', genre: 'R&B' },
    { name: 'Fred again..', region: 'UK', genre: 'electronic' },
    { name: 'Lola Young', region: 'UK', genre: 'soul' },
    { name: 'Brent Faiyaz', region: 'US', genre: 'alt-R&B' },
    { name: 'Central Cee', region: 'UK', genre: 'UK rap' },
  ],

  // 25 slots — nationally known. The tier that gets you in rooms.
  tier3_national: [
    { name: 'BLACKPINK', region: 'KR', genre: 'K-pop' },
    { name: 'Summer Walker', region: 'US', genre: 'R&B' },
    { name: 'Sexyy Red', region: 'US', genre: 'trap' },
    { name: 'Wizkid', region: 'NG', genre: 'afrobeats' },
    { name: 'JID', region: 'US', genre: 'rap' },
    { name: 'Yeat', region: 'US', genre: 'rage' },
    { name: 'Latto', region: 'US', genre: 'trap' },
    { name: 'GloRilla', region: 'US', genre: 'trap' },
    { name: 'Leon Thomas', region: 'US', genre: 'R&B' },
    { name: 'NewJeans', region: 'KR', genre: 'K-pop' },
    { name: 'Jhené Aiko', region: 'US', genre: 'R&B' },
    { name: 'Jorja Smith', region: 'UK', genre: 'R&B' },
    { name: 'Ice Spice', region: 'US', genre: 'drill' },
    { name: 'Flo Milli', region: 'US', genre: 'rap' },
    { name: 'Stray Kids', region: 'KR', genre: 'K-pop' },
    { name: 'Ninho', region: 'FR', genre: 'rap' },
    { name: 'Stormzy', region: 'UK', genre: 'grime' },
    { name: 'Fontaines D.C.', region: 'IE', genre: 'indie rock' },
    { name: 'Faye Webster', region: 'US', genre: 'indie' },
    { name: 'Denzel Curry', region: 'US', genre: 'rap' },
    { name: 'Nemzzz', region: 'UK', genre: 'UK rap' },
    { name: 'Ken Carson', region: 'US', genre: 'rage' },
    { name: 'Odeal', region: 'UK', genre: 'alt-R&B' },
    { name: 'BossMan Dlow', region: 'US', genre: 'trap' },
    { name: 'Amaarae', region: 'NG', genre: 'alté' },
  ],

  // 20 slots — buzzing, scene-level. Cheap to work with, may go somewhere.
  tier2_rising: [
    { name: 'Sammy Virji', region: 'UK', genre: 'garage' },
    { name: 'Little Simz', region: 'UK', genre: 'UK rap' },
    { name: 'Destroy Lonely', region: 'US', genre: 'rage' },
    { name: 'Cleo Sol', region: 'UK', genre: 'soul' },
    { name: 'Apache 207', region: 'DE', genre: 'rap' },
    { name: 'Vince Staples', region: 'US', genre: 'rap' },
    { name: 'Freddie Gibbs', region: 'US', genre: 'boom bap' },
    { name: 'Smino', region: 'US', genre: 'jazz rap' },
    { name: 'Rachel Chinouriri', region: 'UK', genre: 'indie-pop' },
    { name: 'Cash Cobain', region: 'US', genre: 'drill' },
    { name: '4batz', region: 'US', genre: 'alt-R&B' },
    { name: 'Westside Gunn', region: 'US', genre: 'boom bap' },
    { name: 'Sampha', region: 'UK', genre: 'alt-R&B' },
    { name: 'Veeze', region: 'US', genre: 'trap' },
    { name: 'SoFaygo', region: 'US', genre: 'rage' },
    { name: 'Turnstile', region: 'US', genre: 'hardcore' },
    { name: 'Lay Bankz', region: 'US', genre: 'jersey club' },
    { name: 'Fimiguerrero', region: 'UK', genre: 'UK rap' },
    { name: 'Bktherula', region: 'US', genre: 'rage' },
    { name: 'Nia Archives', region: 'UK', genre: 'jungle' },
  ],

  // 15 slots — unknowns. Also procedurally generatable (see makeLocalName).
  tier1_local: [
    { name: 'TiaCorine', region: 'US', genre: 'trap' },
    { name: 'Mk.gee', region: 'US', genre: 'indie' },
    { name: 'Arlo Parks', region: 'UK', genre: 'indie-pop' },
    { name: 'Kevin Abstract', region: 'US', genre: 'alt-pop' },
    { name: 'Jane Remover', region: 'US', genre: 'hyperpop' },
    { name: 'Chase Shakur', region: 'US', genre: 'alt-R&B' },
    { name: 'Saba', region: 'US', genre: 'jazz rap' },
    { name: 'Debbie', region: 'NG', genre: 'alté' },
    { name: 'Noname', region: 'US', genre: 'poetry rap' },
    { name: 'Nourished by Time', region: 'US', genre: 'alt-R&B' },
    { name: 'Anycia', region: 'US', genre: 'trap' },
    { name: 'Deb Never', region: 'US', genre: 'indie' },
    { name: 'LSDXOXO', region: 'US', genre: 'house' },
    { name: 'Wallice', region: 'US', genre: 'indie-pop' },
    { name: 'Kenzo Balla', region: 'US', genre: 'drill' },
  ],

  // 15 slots — US underground rap. A PARALLEL TRACK, NOT A LOWER TIER.
  // High taste, low relevance, near-zero cash. The Architect route.
  underground_us: [
    { name: '2hollis', region: 'US', genre: 'hyperpop' },
    { name: 'slayr', region: 'US', genre: 'rage' },
    { name: 'Nettspend', region: 'US', genre: 'rage' },
    { name: 'xaviersobased', region: 'US', genre: 'rage' },
    { name: 'osamason', region: 'US', genre: 'plugg' },
    { name: 'che', region: 'US', genre: 'plugg' },
    { name: 'Kamiyada+', region: 'US', genre: 'rage' },
    { name: 'Yhapojj', region: 'US', genre: 'plugg' },
    { name: 'Autumn!', region: 'US', genre: 'plugg' },
    { name: 'Sematary', region: 'US', genre: 'noise rap' },
    { name: 'LUCKI', region: 'US', genre: 'cloud rap' },
    { name: 'MIKE', region: 'US', genre: 'abstract rap' },
    { name: 'Navy Blue', region: 'US', genre: 'abstract rap' },
    { name: 'billy woods', region: 'US', genre: 'experimental rap' },
    { name: 'redveil', region: 'US', genre: 'soul-sample rap' },
  ],

  // 10 slots — the film scoring track.
  directors: [
    { name: 'Christopher Nolan', region: 'UK', genre: 'blockbuster' },
    { name: 'Denis Villeneuve', region: 'CA', genre: 'sci-fi' },
    { name: 'Greta Gerwig', region: 'US', genre: 'coming-of-age' },
    { name: 'Jordan Peele', region: 'US', genre: 'psychological horror' },
    { name: 'Ari Aster', region: 'US', genre: 'psychological horror' },
    { name: 'Barry Jenkins', region: 'US', genre: 'prestige drama' },
    { name: 'Chloé Zhao', region: 'US', genre: 'slow cinema' },
    { name: 'Ryan Coogler', region: 'US', genre: 'blockbuster' },
    { name: 'Céline Sciamma', region: 'FR', genre: 'slow cinema' },
    { name: 'Park Chan-wook', region: 'KR', genre: 'cold thriller' },
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
  'amapiano': 'Afrobeats',
  'hardcore': 'Rock',
  'hip-hop': 'Hip-Hop/Rap',
  'historical epic': 'Film Score',
  'horrorcore': 'Hip-Hop/Rap',
  'house': 'Electronic/Dance',
  'hyperpop': 'Electronic/Dance',
  'jersey club': 'Electronic/Dance',
  'K-pop': 'Pop',
  'metal': 'Rock',
  'plugg': 'Hip-Hop/Rap',
  'psychedelic rock': 'Rock',
  'rage': 'Hip-Hop/Rap',
  'reggaeton': 'Latin',
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
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  CA: 'Canada',
  AU: 'Australia',
  MX: 'Mexico',
  NG: 'Nigeria',
  ZA: 'South Africa',
  KR: 'South Korea',
  BR: 'Brazil',
  CO: 'Colombia',
  PR: 'Puerto Rico',
};

/**
 * Territories open up as the OVERALL RATING climbs.
 * Value = the minimum rating required to be cast from that territory.
 */
export const TERRITORY_UNLOCK = {
  US: 0,
  UK: 70, IE: 70,
  DE: 78, FR: 78, ES: 78, CA: 78, AU: 78, MX: 78,
  NG: 78, ZA: 78, KR: 78, BR: 78, CO: 78, PR: 78,
};

/* --- procedural filler for tier1_local, so the bottom never runs dry --- */
const FIRST = ['Dre', 'Kayla', 'Marco', 'Tayshaun', 'Elena', 'Petey', 'June', 'Omar', 'Britt', 'Cash', 'Neveah', 'Slim', 'Roddy', 'Winnie', 'Zeke'];
const LAST = ['from work', 'from the lot', 'with the van', 'in 4B', "who owes you $40", 'from church', 'from the smoke shop', 'from third period'];

export function makeLocalName(rand) {
  const a = FIRST[Math.floor(rand() * FIRST.length)];
  const b = LAST[Math.floor(rand() * LAST.length)];
  return { name: `${a} ${b}`, region: 'US', genre: 'unsigned' };
}

/* ------------------------------------------------------------------ */
/* MONTHLY LISTENERS                                                   */
/* ------------------------------------------------------------------ */

/**
 * Every roster artist's monthly listeners, keyed by name.
 *
 * Built once at load from their tier — see listeners.js, which also carries the
 * warning that these figures are invented for the game and are not the real
 * ones. Directors are not in here: they do not have listeners, and a credit
 * that is not a roster artist at all (a television series, a short film) falls
 * out as null, which is what tells the UI to print nothing rather than a zero.
 */
const LISTENERS = new Map();
for (const [key, tier] of Object.entries({
  tier1_local: 1, tier2_rising: 2, tier3_national: 3, tier4_international: 4, tier5_global: 5,
})) {
  for (const a of ROSTER[key] || []) LISTENERS.set(a.name, listenersFor(a.name, tier, false));
}
for (const a of ROSTER.underground_us || []) LISTENERS.set(a.name, listenersFor(a.name, 1, true));

/** Monthly listeners for a credited name, or null if it is not a roster artist. */
export function listenersOf(name) {
  return LISTENERS.has(name) ? LISTENERS.get(name) : null;
}
