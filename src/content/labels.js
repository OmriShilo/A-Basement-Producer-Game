/**
 * labels.js — the houses that sign producers.
 *
 * A label deal is the one commitment in the game that lasts more than a year.
 * You sign for a term, and while it runs the label's own artists are who you
 * end up in rooms with — sign to Cactus Jack and you start racking up Travis
 * Scott and Don Toliver records, because that is what being on the roster
 * actually does for a producer.
 *
 * ON THE ROSTERS BELOW
 *
 * Real label names with plausible artist lists, assembled for the game rather
 * than as a claim about who is signed where today. Label rosters churn
 * constantly, deals lapse, artists leave, and imprint-versus-distributor is a
 * genuine mess in most of these cases. Every name listed is an artist who is
 * meaningfully associated with that house, but treat the lists as flavour, not
 * as documentation. They must only ever contain names that exist in roster.js —
 * see the assertion in engine/labels.js, which fails loudly on a typo.
 *
 * FIELDS
 *   id        unique
 *   name      as printed on the signed-to indicator
 *   kind      'IMPRINT' (an artist-run house) | 'MAJOR' | 'INDIE'
 *   reach     the tier you have to be able to reach before they want you
 *   term      [min, max] years they sign you for
 *   artists   names from roster.js — the house's roster AND its close orbit,
 *             i.e. who you end up in rooms with while signed. Deliberately
 *             spread across several tiers: a label whose names all sit in one
 *             tier almost never intersects the pool a given card is casting
 *             from, and the deal then does nothing you can feel.
 *   line      one sentence for the card body
 */

export const LABELS = [
  {
    id: 'cactus_jack',
    name: 'Cactus Jack',
    kind: 'IMPRINT',
    reach: 4,
    term: [2, 4],
    artists: ['Travis Scott', 'Don Toliver', 'SoFaygo', 'Metro Boomin', 'Playboi Carti', 'Yeat'],
    line: 'a house built around one artist, and everything that orbits him',
  },
  {
    id: 'opium',
    name: 'Opium',
    kind: 'IMPRINT',
    reach: 3,
    term: [2, 3],
    artists: ['Playboi Carti', 'Ken Carson', 'Destroy Lonely', 'Yeat', 'Bktherula', 'Veeze'],
    line: 'a sound so specific that signing to it is a decision about your own',
  },
  {
    id: 'ovo',
    name: 'OVO Sound',
    kind: 'IMPRINT',
    reach: 4,
    term: [2, 4],
    artists: ['Drake', 'PARTYNEXTDOOR', 'Future', '21 Savage', 'Nicki Minaj', 'Summer Walker'],
    line: 'the most protected room in the business, if you can get inside it',
  },
  {
    id: 'tde',
    name: 'Top Dawg Entertainment',
    kind: 'IMPRINT',
    reach: 3,
    term: [3, 4],
    artists: ['SZA', 'Doechii', 'Jhené Aiko', 'Kendrick Lamar', 'Ravyn Lenae', 'Chase Shakur'],
    line: 'they develop people slowly and they do not let go early',
  },
  {
    id: 'dreamville',
    name: 'Dreamville',
    kind: 'IMPRINT',
    reach: 3,
    term: [2, 3],
    artists: ['JID', 'Smino', 'Saba', 'Denzel Curry', 'Amaarae', 'Noname'],
    line: 'a writers house first, which is either the point or the problem',
  },
  {
    id: 'ysl',
    name: 'YSL',
    kind: 'IMPRINT',
    reach: 3,
    term: [1, 3],
    artists: ['Young Thug', 'Gunna', 'Lil Baby', 'Future', 'Veeze', 'BossMan Dlow'],
    line: 'the most productive room in the city and the least predictable one',
  },
  {
    id: 'roc_nation',
    name: 'Roc Nation',
    kind: 'MAJOR',
    reach: 4,
    term: [3, 4],
    artists: ['JAY-Z', 'Rihanna', 'Nicki Minaj', 'Jorja Smith', 'Tems', 'Westside Gunn'],
    line: 'less a label than a set of doors that open when they say your name',
  },
  {
    id: 'interscope',
    name: 'Interscope',
    kind: 'MAJOR',
    reach: 4,
    term: [2, 4],
    artists: ['Kendrick Lamar', 'Lady Gaga', 'Olivia Rodrigo', 'Billie Eilish', 'Eminem', 'Ice Spice'],
    line: 'the budget is real and so is the number of people above you',
  },
  {
    id: 'columbia',
    name: 'Columbia',
    kind: 'MAJOR',
    reach: 4,
    term: [2, 4],
    artists: ['Beyoncé', 'Harry Styles', 'Rosalía', 'Tyler, The Creator', 'Lola Young', 'Mk.gee'],
    line: 'a hundred years of catalogue and a very long hallway',
  },
  {
    id: 'quality_control',
    name: 'Quality Control',
    kind: 'IMPRINT',
    reach: 3,
    term: [1, 3],
    artists: ['Lil Baby', 'Cardi B', 'Latto', 'Flo Milli', 'BossMan Dlow', 'Lay Bankz'],
    line: 'they move fast, they move a lot, and they do not wait for you',
  },
  {
    id: 'since_93',
    name: "Since '93",
    kind: 'INDIE',
    reach: 2,
    term: [2, 3],
    artists: ['Little Simz', 'Sampha', 'Cleo Sol', 'Jorja Smith', 'Nia Archives', 'Arlo Parks'],
    line: 'small, careful, and the records last longer than the deals',
  },
  {
    id: 'xl',
    name: 'XL Recordings',
    kind: 'INDIE',
    reach: 2,
    term: [2, 4],
    artists: ['Adele', 'Vince Staples', 'Arlo Parks', 'Mk.gee', 'Deb Never', 'Turnstile'],
    line: 'they sign a person, not a quarter, and they are in no hurry',
  },
  {
    id: 'griselda',
    name: 'Griselda',
    kind: 'IMPRINT',
    reach: 2,
    term: [1, 3],
    artists: ['Westside Gunn', 'Freddie Gibbs', 'Denzel Curry', 'Saba', 'billy woods', 'MIKE'],
    line: 'no radio, no compromise, and a catalogue people actually keep',
  },
  {
    id: 'alamo',
    name: 'Alamo',
    kind: 'INDIE',
    reach: 2,
    term: [1, 3],
    artists: ['Yeat', 'Sexyy Red', 'BossMan Dlow', 'Veeze', 'Lay Bankz', 'Anycia'],
    line: 'they find them early and they are rarely wrong for long',
  },
];

export const LABEL_BY_ID = new Map(LABELS.map((l) => [l.id, l]));
