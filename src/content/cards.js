/**
 * cards.js — pure content.
 *
 * TWO KINDS OF CARD
 *
 *   GREEN (regular)  What it says is what happens. No roll.
 *   YELLOW (gamble)  States its odds on its face, then rolls them. On a win
 *                    the accept effects land. On a loss they do not, and the
 *                    card's own `fail` effects land instead.
 *
 * The old design rule was that accepting a card never rolls dice. Yellow cards
 * deliberately break it, and the break is the feature: the odds are printed
 * before you commit, so a bet you lose is a bet you chose, not a trick. Green
 * cards still honour the old rule exactly.
 *
 * WRITING THE NUMBERS
 *
 * Ordinary years should move the rating by 1–3, either way. That is the texture
 * of a career: +1, +1, −1, +2, +3, −1. Big moves are not bigger `rating`
 * values — they are `ratingJump`, which skips the diminishing-returns curve
 * entirely and is reserved for the handful of cards that genuinely change a
 * life in one year. A jump is the only way to the top of the scale, so they
 * stay rare and are mostly gated behind a gamble.
 *
 * SCHEMA
 *   id       unique
 *   cls      'COMMON' | 'CONTRACT' | 'RARE'   (draw class, not colour)
 *   title    short, no punctuation
 *   cast     { tier: 1..5 } | { track: 'underground' | 'director' | 'any' } | null
 *            -> injects {artist} into body/diary from roster.js
 *            'any' can name anybody in the game; which tier is rolled at cast
 *            time, weighted so the top of the roster stays rare, and gated by
 *            age. The chosen tier rides along on the cast as `cast.tier`, so a
 *            card written for 'any' can size its own payoff.
 *   req      gating. scalar = minimum, [a,b] = inclusive range.
 *            keys: rating age flags not
 *                  flags (all required) not (none may be present)
 *   weight   draw weight within its class (default 1)
 *   repeatable  true = never leaves the deck
 *   rack     true = taking this opens THE RACK and the year is scored on what
 *            you played there, on top of the card's own fx. See engine/rack.js.
 *   labelOffer  true = a house is offering you a deal. The label is chosen at
 *            draw time from those that would have you (engine/labels.js) and
 *            rides on the offer as `offer.label`; {label} in body/diary is its
 *            name. Taking it signs you for 1–4 years.
 *   renewal  true = this offer is the label you are already with, asking for
 *            another term. Only eligible while the `label_renewal` flag is set,
 *            which tickLabel sets when a term ends well. Passing on it ends the
 *            relationship — they do not ask twice.
 *   gamble   { chance }  makes the card yellow. `chance` is a 0–1 number, or
 *            (cast) => number when the odds depend on who it cast.
 *   stakes   [win, lose]  what a yellow card swings, in FORM (temporary
 *            overall) — never permanent rating. A bet coming off is a good few
 *            months, not a career. Banded by the odds: long shots run [3,-2],
 *            coin flips [2,-2], safe bets [1,-1]. Anything permanent a yellow
 *            card produces comes from its `placement` / `ratingJump`, i.e. from
 *            an actual record, not from the bet paying out.
 *   accept / pass / fail:
 *            label   button text (accept/pass only)
 *            fx      effects object, or (s) => effects object
 *            diary   string (tokens {artist} {age}) or null to fall through
 *
 * EFFECT KEYS
 *   rating                     whole rating points, + or −; scaled by the curve
 *   ratingJump                 whole rating points that BYPASS the curve
 *   placement: { tier }        records a credit with the cast artist
 *   underground: true          marks the placement as underground-track
 *   score: true                the placement is a score (Oscar/Emmy eligible)
 *   tv: true                   the placement is television (Emmy eligible)
 *   flags: []                  set run flags
 *   clearFlags: []
 */

export const CARDS = [
  /* ================================================================= */
  /* GREEN — regular cards. What it says is what happens.              */
  /* ================================================================= */
  {
    id: 'g_sixty_dollars',
    cls: 'COMMON',
    title: 'Sixty dollars',
    cast: { tier: 1 },
    req: { age: [16, 26] },
    weight: 3,
    body: (v) => `${v.artist} found your beat in a group chat and wants it for a mixtape nobody will hear. There is sixty dollars in it and no contract.`,
    accept: {
      label: 'Sell it',
      fx: { rating: 1, placement: { tier: 1 }, flags: ['early_collab'] },
      diary: 'you sold your first beat to {artist} for sixty dollars and did not sleep that night.' },
    pass: { label: 'Keep it', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_beat_pack',
    cls: 'COMMON',
    title: 'The pack',
    repeatable: true,
    weight: 3,
    body: () => 'Twenty beats, one folder, forty emails. Most will not be opened. It is how this actually works and it takes the whole year.',
    accept: {
      label: 'Send the pack',
      fx: { rating: 1 },
      diary: 'you sent forty emails and got two replies, and one of them was a yes.' },
    pass: { label: 'Not this year', fx: {}, diary: null } },

  {
    id: 'g_loop_split',
    cls: 'COMMON',
    title: 'The loopmaker',
    req: { age: [17, 40] },
    weight: 2,
    body: () => 'Someone sends you a loop that finishes the beat in four bars. They want half the production split for it. Half of something is the whole argument.',
    accept: {
      label: 'Give up half',
      fx: { rating: 2, flags: ['loop_network'] },
      diary: 'you gave away half a split for four bars you could not have written, and it was worth it.' },
    pass: { label: 'Write it yourself', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_learn_to_mix',
    cls: 'COMMON',
    title: 'The engineer',
    req: { age: [17, 34] },
    weight: 2,
    body: () => 'Your beats keep getting re-mixed by somebody else before release. You could spend the year learning to hand over something finished.',
    accept: {
      label: 'Learn it properly',
      fx: { rating: 2, flags: ['engineer'] },
      diary: 'you spent a year on gain staging and stopped being embarrassed by your own bounces.' },
    pass: { label: 'Let them fix it', fx: {}, diary: null } },

  {
    id: 'g_producer_tag',
    cls: 'COMMON',
    title: 'The tag',
    req: { age: [16, 30] },
    weight: 2,
    body: () => 'Every producer you look up to has three seconds at the top of the song that tells everyone whose it is. You do not have one yet.',
    accept: {
      label: 'Make the tag',
      fx: { rating: 1, flags: ['tag'] },
      diary: 'you recorded your tag eleven times and picked the ninth. You still hear it in your sleep.' },
    pass: { label: 'Stay anonymous', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_track_nine',
    cls: 'CONTRACT',
    title: 'Track nine',
    cast: { tier: 3 },
    req: { rating: 62 },
    weight: 3,
    body: (v) => `${v.artist}'s album has a hole at track nine. It will never be a single. It will be on the album, with your name on it, forever.`,
    accept: {
      label: 'Fill it',
      fx: { rating: 2, placement: { tier: 3 }, flags: ['album_credit'] },
      diary: 'you got track nine on {artist}\'s album. Nobody calls it the single. It is still on the album.' },
    pass: { label: 'Hold out for a single', fx: {}, diary: null } },

  {
    id: 'g_admin_deal',
    cls: 'CONTRACT',
    title: 'Publishing',
    req: { rating: 66, age: [20, 45] },
    weight: 3,
    body: () => 'An administration deal. They take fifteen percent and in exchange somebody finally registers your splits, chases your royalties and answers the phone.',
    accept: {
      label: 'Sign the admin deal',
      fx: { rating: 2, flags: ['publishing'] },
      diary: 'you signed an admin deal and found out you had been owed money for four years.' },
    pass: { label: 'Do it yourself', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_the_manager',
    cls: 'CONTRACT',
    title: 'Management',
    req: { rating: 68, age: [19, 44] },
    weight: 2,
    body: () => 'A manager who already has two producers you respect wants to take you on. Twenty percent, and you stop being the one asking for the session.',
    accept: {
      label: 'Sign with them',
      fx: { rating: 2, flags: ['manager_pending'] },
      diary: 'you got a manager and stopped sending the emails yourself.' },
    pass: { label: 'Stay independent', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_the_move',
    cls: 'COMMON',
    title: 'The move',
    req: { rating: 60, age: [18, 32] },
    weight: 3,
    body: () => 'Everyone you would work with is in one of three cities and you are not in any of them. The rent is roughly everything you have.',
    accept: {
      label: 'Move',
      fx: { rating: 3, flags: ['moved'] },
      diary: 'you moved with two bags and a hard drive and knew nobody for eight months.' },
    pass: { label: 'Stay put', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_real_room',
    cls: 'COMMON',
    title: 'Real hours',
    req: { rating: 64, age: [19, 42] },
    weight: 2,
    body: () => 'A proper room, booked by the day, with someone else running the desk. It costs more than you make and everything you record in it sounds like a record.',
    accept: {
      label: 'Book the time',
      fx: { rating: 2 },
      diary: 'you booked a real room for the first time and heard what your records were supposed to sound like.' },
    pass: { label: 'Stay in the bedroom', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_clear_the_sample',
    cls: 'COMMON',
    title: 'The clearance',
    req: { rating: 65, age: [19, 46] },
    weight: 2,
    body: () => 'The record is built on four bars of somebody else. Clearing it properly costs most of the advance and takes eleven months of email.',
    accept: {
      label: 'Clear it',
      fx: { rating: 2, flags: ['clean_splits'] },
      diary: 'you cleared the sample properly and the record came out eleven months late and entirely yours.' },
    pass: { label: 'Replay it', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_fix_the_splits',
    cls: 'COMMON',
    title: 'The split sheet',
    req: { rating: 63, age: [19, 48] },
    weight: 2,
    body: () => 'Three records out, no signed split sheets on any of them. Everybody remembers the room differently. You can still fix it while people are speaking.',
    accept: {
      label: 'Get it in writing',
      fx: { rating: 2, flags: ['clean_splits'] },
      diary: 'you got three split sheets signed and lost one friend doing it.' },
    pass: { label: 'Trust them', fx: {}, diary: null } },

  {
    id: 'g_session_musician',
    cls: 'COMMON',
    title: 'The player',
    repeatable: true,
    req: { rating: 62, age: [20, 50] },
    weight: 2,
    body: () => 'A bass player who has been doing this for thirty years will come in for a day rate. One take of a real instrument does what four plugins could not.',
    accept: {
      label: 'Book the player',
      fx: { rating: 2 },
      diary: 'you paid a bass player a day rate and he fixed the record in twenty minutes.' },
    pass: { label: 'Program it', fx: {}, diary: null } },

  {
    id: 'g_sync_placement',
    cls: 'CONTRACT',
    title: 'The sync',
    repeatable: true,
    req: { rating: 70, age: [22, 50] },
    weight: 2,
    body: () => 'A show wants an instrumental for a scene where nobody speaks. It pays more than any placement you have had and nobody will know it is yours.',
    accept: {
      label: 'Take the sync',
      /* Deliberately NOT `tv: true`. An Emmy is for original composition, not
         for a show licensing an instrumental you already had — and because
         this card is repeatable, marking it television farmed a nomination
         every time it came round: 1,580 Emmy wins across 4,000 runs. */
      fx: { rating: 2, placement: { tier: 2, credit: 'a television series' } },
      diary: 'a show used your instrumental in a scene where nobody spoke, and it paid better than the album did.' },
    pass: { label: 'Turn it down', fx: {}, diary: null } },

  {
    id: 'g_short_film',
    cls: 'CONTRACT',
    title: 'The short',
    cast: { track: 'director' },
    req: { rating: 72, age: [24, 50] },
    weight: 2,
    body: (v) => `${v.artist} has eighteen minutes of film and no music. There is almost no money and the credit is a scoring credit.`,
    accept: {
      label: 'Score it',
      fx: { rating: 2, placement: { tier: 2, credit: 'a short film' }, score: true, flags: ['scored'] },
      diary: 'you scored eighteen minutes of {artist}\'s film for almost nothing and put SCORE on your credits.' },
    pass: { label: 'Stay in music', fx: {}, diary: null } },

  {
    /* The only television-composition card in the deck, and therefore the only
       route to an Emmy trophy. Not repeatable and gated high on purpose: this
       is scoring a series, not licensing an instrumental to one. */
    id: 'g_title_sequence',
    cls: 'CONTRACT',
    title: 'The series',
    cast: { track: 'director' },
    req: { rating: 76, age: [26, 50] },
    weight: 2,
    body: (v) => `${v.artist} has eight episodes and wants the whole score, not a needle drop. Six months of writing to picture, to a schedule that does not move.`,
    accept: {
      label: 'Score the series',
      fx: { rating: 3, placement: { tier: 3, credit: 'a television series' }, score: true, tv: true, flags: ['scored'] },
      diary: 'you wrote six months of music to picture for {artist} and learned to work to somebody else\'s clock.' },
    pass: { label: 'Stay in records', fx: {}, diary: null } },

  {
    id: 'g_the_camp',
    cls: 'COMMON',
    title: 'The camp',
    repeatable: true,
    req: { rating: 68, age: [20, 44] },
    weight: 2,
    body: () => 'Ten producers, four writers, one house, six days. Most of what gets made will never come out. The people you meet are the actual point.',
    accept: {
      label: 'Go to camp',
      fx: { rating: 2, flags: ['camp_network'] },
      diary: 'you spent six days in a house with ten producers and left with two friends and nothing finished.' },
    pass: { label: 'Work alone', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_underground_run',
    cls: 'COMMON',
    title: 'The tape',
    cast: { track: 'underground' },
    /* Repeatable because the underground is a way of working, not one job —
       and because the architect ending counts underground credits, which the
       new deck otherwise caps at two, putting that route out of reach. */
    repeatable: true,
    req: { age: [17, 40] },
    weight: 3,
    body: (v) => `${v.artist} has four thousand listeners and the best pen you have heard all year. There is no budget and no plan and they want to do the whole tape with you.`,
    accept: {
      label: 'Do the whole tape',
      fx: { rating: 2, placement: { tier: 1 }, underground: true },
      diary: 'you did the whole tape with {artist} for nothing and it is still the one people bring up.' },
    pass: { label: 'One beat only', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_teach_it',
    cls: 'COMMON',
    title: 'The masterclass',
    repeatable: true,
    req: { rating: 74, age: [27, 50] },
    weight: 2,
    body: () => 'A room of nineteen-year-olds who know your credits and want to know how you did it. Explaining it out loud makes you realise how much of it you do by accident.',
    accept: {
      label: 'Teach it',
      fx: { rating: 1 },
      diary: 'you explained your own process to a room of nineteen-year-olds and learned more than they did.' },
    pass: { label: 'Keep it to yourself', fx: {}, diary: null } },

  {
    id: 'g_own_room',
    cls: 'CONTRACT',
    title: 'Your own room',
    req: { rating: 76, age: [26, 50] },
    weight: 2,
    body: () => 'A lease, a contractor and a room built to your own drawings. It is the end of asking anybody for time, and it is a debt with your name on it.',
    accept: {
      label: 'Build it',
      fx: { rating: 3, flags: ['own_room'] },
      diary: 'you built your own room and never had to ask anyone for time again.' },
    pass: { label: 'Keep renting', fx: { rating: 1 }, diary: null } },

  {
    id: 'g_the_credit_finally',
    cls: 'CONTRACT',
    title: 'The single',
    cast: { tier: 4 },
    req: { rating: 78, age: [24, 50] },
    weight: 2,
    body: (v) => `${v.artist} is picking singles and yours is on the shortlist. Whatever happens next happens to you as well.`,
    accept: {
      label: 'Push for the single',
      fx: { rating: 3, placement: { tier: 4 } },
      diary: 'they took your record as the single and your life stopped being quiet.' },
    pass: { label: 'Take the album cut', fx: { rating: 1, placement: { tier: 3 } }, diary: null } },

  /* ================================================================= */
  /* YELLOW — gamble cards. The odds are on the card. Then they roll.  */
  /* ================================================================= */
  {
    /* THE ONE THAT CAN BE ANYBODY.
       Cast as 'any', so the name in the blank runs from a kid two
       neighbourhoods over to the biggest artist alive, weighted so the top of
       the roster is rare and age-gated so it cannot happen at sixteen. The
       payoff and the odds are both read off the tier that got rolled: a local
       room is an 80% shot worth a couple of points, a tier-5 room is a 35% shot
       worth a jump of 12 — the Travis Scott session that changes the career in
       one year. It is repeatable because the blank is different every time. */
    id: 'y_the_invitation',
    cls: 'RARE',
    title: 'The invitation',
    cast: { track: 'any' },
    repeatable: true,
    weight: 2,
    gamble: { chance: (cast) => [0, 0.80, 0.70, 0.58, 0.46, 0.35][(cast && cast.tier) || 1] },
    stakes: [3, -2],
    body: (v) => `${v.artist} is in that studio until Thursday and somebody put your name on the list. You get one night in the room. Either you leave with a song or you leave having been there.`,
    accept: {
      label: 'Go to the session',
      fx: (s) => {
        const t = (s.cast && s.cast.tier) || 1;
        return {
          // No flat `rating` here: this is a yellow card, so its win/loss
          // swing is carried by `stakes` as form. What survives is the credit
          // and the jump — those are a real record, not a hot streak.
          // The whole reason jumps exist. A tier-5 room that converts is the
          // single biggest thing that can happen in a career. The bottom two
          // tiers get no jump at all — this card is repeatable, and a local
          // room that pays a jump every time it comes round is a treadmill.
          ratingJump: [0, 0, 0, 2, 6, 12][t],
          placement: { tier: t },
          flags: ['been_in_the_room'],
        };
      },
      diary: 'you were in the room with {artist} until six in the morning and you left with a song.' },
    fail: {
      fx: {},
      diary: 'you sat in {artist}\'s session for nine hours, played four things, and nobody looked up.' },
    pass: { label: 'Stay home', fx: {}, diary: null } },

  {
    id: 'y_fly_out',
    cls: 'CONTRACT',
    title: 'The fly-out',
    cast: { tier: 3 },
    req: { rating: 60, age: [18, 42] },
    weight: 3,
    gamble: { chance: 0.45 },
    stakes: [3, -2],
    body: (v) => `${v.artist}'s camp says come out, but they are not paying for it. The flight and the week are yours. Half the producers you know have done this and come home with nothing.`,
    accept: {
      label: 'Book the flight',
      fx: { placement: { tier: 3 } },
      diary: 'you paid for your own flight and came home with a record.' },
    fail: {
      fx: {},
      diary: 'you paid for the flight and the week and never got in the room. Nobody was lying. It just did not happen.' },
    pass: { label: 'Make them pay', fx: {}, diary: null } },

  {
    id: 'y_hold_the_masters',
    cls: 'CONTRACT',
    title: 'The advance',
    req: { rating: 70, age: [21, 46] },
    weight: 2,
    gamble: { chance: 0.5 },
    stakes: [2, -2],
    body: () => 'They will pay you properly today for everything you own, or nothing today for keeping it. You have seen this go both ways with people you know.',
    accept: {
      label: 'Keep the masters',
      fx: { flags: ['owns_masters'] },
      diary: 'you turned down the advance and kept everything, and for two years it looked like a mistake.' },
    fail: {
      fx: {},
      diary: 'you kept your masters and nobody ever came back with an offer. You still own all of it.' },
    pass: { label: 'Take the money', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_leak_the_snippet',
    cls: 'COMMON',
    title: 'The snippet',
    req: { rating: 62, age: [17, 36] },
    weight: 3,
    gamble: { chance: 0.4 },
    stakes: [3, -2],
    body: () => 'Fifteen seconds of the unreleased record, posted from your own account. If it moves, the label has to put it out. If it does not, you leaked somebody else\'s song for nothing.',
    accept: {
      label: 'Post it',
      fx: { flags: ['viral'] },
      diary: 'you posted fifteen seconds at one in the morning and woke up to it everywhere.' },
    fail: {
      fx: { flags: ['burned_bridge'] },
      diary: 'you leaked the snippet, it did nothing, and the artist\'s manager made sure everyone knew it was you.' },
    pass: { label: 'Wait for the rollout', fx: {}, diary: null } },

  {
    id: 'y_cold_email',
    cls: 'COMMON',
    title: 'The cold send',
    cast: { tier: 4 },
    req: { rating: 64, age: [17, 40] },
    weight: 3,
    gamble: { chance: 0.35 },
    stakes: [3, -2],
    body: (v) => `You have an A&R's real email and one beat you would bet the year on. Sending it burns the only cold shot you get at ${v.artist}'s camp.`,
    accept: {
      label: 'Send it cold',
      fx: { placement: { tier: 4 } },
      diary: 'you sent one beat cold to an A&R and eleven days later it was somebody\'s single.' },
    fail: {
      fx: {},
      diary: 'you sent the best thing you had made to an A&R and it was never opened.' },
    pass: { label: 'Wait for a warm intro', fx: {}, diary: null } },

  {
    id: 'y_uncleared',
    cls: 'COMMON',
    title: 'The uncleared sample',
    req: { rating: 63, age: [18, 44] },
    weight: 3,
    gamble: { chance: 0.55 },
    stakes: [2, -1],
    body: () => 'It is four bars of a record from 1974 and it is the entire song. Clearing it will take a year and most of the money. Putting it out will take an afternoon.',
    accept: {
      label: 'Put it out anyway',
      fx: { placement: { tier: 2 } },
      diary: 'you put it out uncleared and nobody ever came looking.' },
    fail: {
      fx: {},
      diary: 'the letter came fourteen months later. You had already spent the money and the record came down.' },
    pass: { label: 'Clear it or kill it', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_the_360',
    cls: 'CONTRACT',
    title: 'The 360',
    req: { rating: 72, age: [20, 44] },
    weight: 2,
    gamble: { chance: 0.5 },
    stakes: [2, -2],
    body: () => 'A real deal with a real budget, and a clause taking a piece of everything you do for seven years, including the parts that have nothing to do with them.',
    accept: {
      label: 'Sign it',
      fx: { flags: ['signed_360'] },
      diary: 'you signed the 360 and for the first time in your life the budget was not the problem.' },
    fail: {
      fx: { flags: ['shelved'] },
      diary: 'you signed the 360 and then they shelved you, and the clause meant you could not go anywhere else either.' },
    pass: { label: 'Stay free', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_quit_the_job',
    cls: 'COMMON',
    title: 'The job',
    req: { age: [18, 30] },
    weight: 3,
    gamble: { chance: 0.6 },
    stakes: [2, -1],
    body: () => 'Nine hours a day that pay the rent and take every hour you would have worked. Quitting buys you a year of music and about four months of savings.',
    accept: {
      label: 'Quit',
      fx: {},
      diary: 'you quit the job with four months of savings and made it to month eleven.' },
    fail: {
      fx: {},
      diary: 'you quit the job, ran out in month five, and went back to a worse one with your tail down.' },
    pass: { label: 'Keep the job', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_beat_battle',
    cls: 'COMMON',
    title: 'The battle',
    req: { age: [17, 32] },
    weight: 2,
    gamble: { chance: 0.45 },
    stakes: [3, -2],
    body: () => 'A room of two hundred people and eight producers with one beat each. Everyone who matters locally will be there, watching you win or watching you lose.',
    accept: {
      label: 'Enter it',
      fx: { flags: ['local_name'] },
      diary: 'you won the battle in front of two hundred people and everyone in the city knew your name by Monday.' },
    fail: {
      fx: {},
      diary: 'you went out in the second round to a kid four years younger and had to stay for the rest of it.' },
    pass: { label: 'Stay out of it', fx: {}, diary: null } },

  {
    id: 'y_pay_for_the_verse',
    cls: 'CONTRACT',
    title: 'The feature',
    cast: { tier: 4 },
    req: { rating: 74, age: [22, 48] },
    weight: 2,
    gamble: { chance: 0.5 },
    stakes: [2, -2],
    body: (v) => `${v.artist} will do the verse for a fee you would have to borrow. Half the people who pay for a feature get a record. The other half get an invoice.`,
    accept: {
      label: 'Pay for it',
      fx: { placement: { tier: 4 } },
      diary: 'you borrowed the money for {artist}\'s verse and it came back in three weeks and it was worth every cent.' },
    fail: {
      fx: {},
      diary: 'you paid for the verse. It never came. Everyone told you afterwards that this is what happens.' },
    pass: { label: 'Keep the money', fx: {}, diary: null } },

  {
    id: 'y_gear_debt',
    cls: 'COMMON',
    title: 'The loan',
    req: { age: [18, 38] },
    weight: 2,
    gamble: { chance: 0.65 },
    stakes: [2, -1],
    body: () => 'Everything you need, financed over three years at a rate you did not read closely. The room becomes real today and the payments start next month.',
    accept: {
      label: 'Sign for it',
      fx: {},
      diary: 'you financed the whole room in one afternoon and made better records the same week.' },
    fail: {
      fx: {},
      diary: 'the payments outlived the excitement by about two years.' },
    pass: { label: 'Buy it slowly', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_go_independent',
    cls: 'CONTRACT',
    title: 'Out on your own',
    cast: { tier: 3 },
    req: { rating: 74, age: [23, 48] },
    weight: 2,
    gamble: { chance: 0.5 },
    stakes: [2, -2],
    body: (v) => `${v.artist} wants to leave the label and put the next one out with just you. No marketing, no radio, no safety net, and all of it yours.`,
    accept: {
      label: 'Do it independently',
      fx: { ratingJump: 5, placement: { tier: 4 } },
      diary: 'you put it out with {artist} and nobody else, and it went further than the label ever took them.' },
    fail: {
      fx: {},
      diary: 'you put it out independently with {artist} and found out exactly what a marketing budget was for.' },
    pass: { label: 'Stay with the label', fx: { rating: 1, placement: { tier: 3 } }, diary: null } },

  {
    id: 'y_say_it_publicly',
    cls: 'COMMON',
    title: 'The ghost credit',
    req: { rating: 70, age: [21, 48] },
    weight: 2,
    gamble: { chance: 0.4 },
    stakes: [3, -2],
    body: () => 'You made the record and somebody else is credited for it. You have the session files, the dates and every message. Saying so out loud is a decision you cannot walk back.',
    accept: {
      label: 'Say it publicly',
      fx: { flags: ['spoke_up'] },
      diary: 'you posted the session files with the dates on them and the credit was corrected within a week.' },
    fail: {
      fx: { flags: ['burned_bridge'] },
      diary: 'you said it publicly, you were completely right, and three rooms closed to you anyway.' },
    pass: { label: 'Let it go', fx: { rating: -1 }, diary: null } },

  {
    id: 'y_all_in',
    cls: 'CONTRACT',
    title: 'One artist',
    cast: { tier: 2 },
    req: { rating: 66, age: [19, 42] },
    weight: 2,
    gamble: { chance: 0.5 },
    stakes: [2, -2],
    body: (v) => `${v.artist} is not big yet. You could give them the entire year and turn down everything else, and be the producer of record if it happens.`,
    accept: {
      label: 'Give them the year',
      fx: { ratingJump: 6, placement: { tier: 4 }, flags: ['the_one'] },
      diary: 'you gave {artist} the whole year and they broke, and everyone knew whose records those were.' },
    fail: {
      fx: {},
      diary: 'you gave {artist} the whole year and they did not break, and you had turned everything else down.' },
    pass: { label: 'Keep your options', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_the_deadline',
    cls: 'COMMON',
    title: 'The deadline',
    cast: { tier: 3 },
    req: { rating: 68, age: [20, 46] },
    weight: 2,
    gamble: { chance: 0.7 },
    stakes: [1, -1],
    body: (v) => `${v.artist}'s album masters on Friday and they want one more. It is Tuesday. You can say yes and find out whether you can actually do it.`,
    accept: {
      label: 'Take the deadline',
      fx: { placement: { tier: 3 } },
      diary: 'you had three days and you made it, and it is the best thing on the record.' },
    fail: {
      fx: {},
      diary: 'you had three days and you sent something you were not proud of, and they used it.' },
    pass: { label: 'Say no', fx: {}, diary: null } },

  {
    id: 'y_the_unknown',
    cls: 'COMMON',
    title: 'Nobody yet',
    cast: { track: 'underground' },
    req: { age: [17, 44] },
    weight: 3,
    gamble: { chance: 0.45 },
    stakes: [3, -2],
    body: (v) => `${v.artist} has nine hundred listeners and something you have not heard anyone else do. You would be building the whole thing from nothing, on your own time.`,
    accept: {
      label: 'Build it with them',
      fx: { placement: { tier: 2 }, underground: true },
      diary: 'you found {artist} at nine hundred listeners and were there for all of it.' },
    fail: {
      fx: {},
      diary: 'you gave {artist} two years. They quit and got a job, and the songs are still unreleased.' },
    pass: { label: 'Wait and see', fx: {}, diary: null } },

  {
    id: 'y_the_meeting',
    cls: 'CONTRACT',
    title: 'The label meeting',
    req: { rating: 72, age: [21, 46] },
    weight: 2,
    gamble: { chance: 0.55 },
    stakes: [2, -1],
    body: () => 'Forty minutes in a building where nobody makes anything. They have heard your records. You have one meeting to be the person they thought you were.',
    accept: {
      label: 'Take the meeting',
      fx: { flags: ['label_backing'] },
      diary: 'you took the meeting and walked out with a relationship instead of a deal, which turned out to be better.' },
    fail: {
      fx: {},
      diary: 'you took the meeting, said the wrong things about your own records, and never heard from them again.' },
    pass: { label: 'Cancel it', fx: {}, diary: null } },

  {
    id: 'y_the_tour',
    cls: 'COMMON',
    title: 'The road',
    cast: { tier: 3 },
    req: { rating: 70, age: [21, 44] },
    weight: 2,
    gamble: { chance: 0.6 },
    stakes: [2, -1],
    body: (v) => `${v.artist} wants you out with them for eight months running the live show. It pays properly and you will not make a record the entire time.`,
    accept: {
      label: 'Go on the road',
      fx: { flags: ['road_network'] },
      diary: 'you did eight months out with {artist} and came back knowing everybody.' },
    fail: {
      fx: {},
      diary: 'you did eight months on the road and came back to find the year had happened without you.' },
    pass: { label: 'Stay in the room', fx: { rating: 1 }, diary: null } },

  {
    id: 'y_buy_the_numbers',
    cls: 'COMMON',
    title: 'The numbers',
    req: { rating: 68, age: [20, 44] },
    weight: 2,
    gamble: { chance: 0.35 },
    stakes: [3, -2],
    body: () => 'There is a service that will make the streams look like the record is working. It is not illegal exactly, and every platform is looking for it.',
    accept: {
      label: 'Buy the numbers',
      fx: {},
      diary: 'the numbers moved, the real people followed, and nobody ever asked how it started.' },
    fail: {
      fx: { flags: ['burned_bridge'] },
      diary: 'the platform caught it, stripped the streams and flagged the account, and everybody in the building heard.' },
    pass: { label: 'Let it move on its own', fx: {}, diary: null } },

  {
    id: 'y_hold_it_back',
    cls: 'CONTRACT',
    title: 'The bigger moment',
    cast: { tier: 4 },
    req: { rating: 76, age: [23, 48] },
    weight: 2,
    gamble: { chance: 0.5 },
    stakes: [2, -2],
    body: (v) => `The record is finished and ${v.artist} would put it out now. Holding it for the album cycle makes it a moment instead of a Friday, if the cycle ever comes.`,
    accept: {
      label: 'Hold it back',
      fx: { ratingJump: 6, placement: { tier: 5 } },
      diary: 'you held the record for eight months and it came out as the moment instead of a Friday.' },
    fail: {
      fx: {},
      diary: 'you held the record back and the cycle never came, and it came out two years late into nothing.' },
    pass: { label: 'Put it out Friday', fx: { rating: 1, placement: { tier: 3 } }, diary: null } },


  /* ================================================================= */
  /* LABELS — the only commitment that outlives the year you make it   */
  /* ================================================================= */
  {
    /* The deal itself. Repeatable because a career can hold several, and the
       house on the card is different each time — whoever would have you at the
       reach you have now. Its fx is deliberately thin: signing is worth almost
       nothing on the day. What it is worth is the three years afterwards, when
       the label's own artists start being who you work with. */
    id: 'l_the_deal',
    cls: 'CONTRACT',
    title: 'The deal',
    labelOffer: true,
    repeatable: true,
    /* No rating gate here on purpose — the gate lives on each label
       (labels.js `minOvr`), so who is at the table changes with your OVERALL
       while the card itself stays available. A rating req here would override
       the bottom band's "anyone" and put deals out of reach entirely. The age
       floor stays: nobody signs a producer at seventeen. */
    req: { age: [19, 44], not: ['signed'] },
    weight: 4,
    body: (v) => `${v.label} want you on the roster — ${v.labelLine}. Their producers get the calls you have been chasing, and for the length of the term you are theirs.`,
    accept: {
      label: 'Sign the deal',
      fx: { rating: 2, flags: ['signed'] },
      diary: 'you signed to {label} and the phone started ringing on its own.' },
    pass: { label: 'Stay independent', fx: { rating: 1 }, diary: null } },

  {
    /* Only ever drawn when tickLabel has set label_renewal. Guaranteed a slot
       via the high weight in drawOffers, because a renewal is a decision the
       player has to actually be given. */
    id: 'l_another_term',
    cls: 'CONTRACT',
    title: 'Another term',
    labelOffer: true,
    renewal: true,
    repeatable: true,
    req: { flags: ['label_renewal'] },
    weight: 9,
    body: (v) => `The term is up and ${v.label} want to go again. You know exactly what the last few years were worth. Turning it down means leaving the roster, and the room, for good.`,
    accept: {
      label: 'Re-sign',
      fx: { rating: 2, flags: ['signed'] },
      diary: 'you re-signed with {label} and stayed where the records were.' },
    pass: { label: 'Leave the roster', fx: {}, diary: 'you let the deal with {label} lapse and went back to answering your own emails.' } },

  /* ================================================================= */
  /* THE ORDINARY YEARS — repeatable filler.                           */
  /* Two offers a year for thirty-four years is more cards than the    */
  /* deck holds. These never leave it, so the back half of a career    */
  /* still has something on the table instead of a run of dead years.  */
  /* Low stakes on purpose: they are the years you worked and nothing  */
  /* in particular happened.                                           */
  /* ================================================================= */
  {
    /* THE RACK — the one card you play instead of read. Its fx is empty on
       purpose: everything this year is worth is decided at the keys and added
       by resolveYear, so the card cannot promise a number up front. */
    id: 'o_the_rack', cls: 'COMMON', title: 'The rack', repeatable: true, weight: 6, rack: true,
    body: () => 'Five instruments against the wall and nothing booked. You could shut the door and play until something turns up.',
    accept: { label: 'Open the rack', fx: {}, diary: 'you spent the year at the keys with the door shut, chasing something you could not name.' },
    pass: { label: 'Leave it', fx: {}, diary: null } },
  {
    id: 'o_more_hours', cls: 'COMMON', title: 'More hours', repeatable: true, weight: 2,
    body: () => 'No offers worth the name. You could just work — longer days, no audience, nothing owed to anyone.',
    accept: { label: 'Put in the hours', fx: { rating: 1 }, diary: 'you worked all year on nothing anyone asked for and got quietly better at it.' },
    pass: { label: 'Coast', fx: {}, diary: null } },
  {
    id: 'o_fix_the_room', cls: 'COMMON', title: 'Fix the room', repeatable: true, weight: 2,
    req: { age: [18, 50] },
    body: () => 'The room has never been right. Treat it properly and everything you make in it gets a little more honest.',
    accept: { label: 'Treat the room', fx: { rating: 1 }, diary: 'you finally treated the room and heard what you had actually been making.' },
    pass: { label: 'Live with it', fx: {}, diary: null } },
  {
    id: 'o_teach_someone', cls: 'COMMON', title: 'Somebody younger', repeatable: true, weight: 2,
    req: { age: [24, 50] },
    body: () => 'Somebody fifteen years younger keeps asking you questions you have to think about before answering.',
    accept: { label: 'Show them', fx: { rating: 1 }, diary: 'you showed somebody younger how you do it and had to work out how you do it.' },
    pass: { label: 'Stay busy', fx: {}, diary: null } },
  {
    id: 'o_old_folder', cls: 'COMMON', title: 'The old folder', repeatable: true, weight: 2,
    body: () => 'Four hundred unfinished ideas going back years. Most are nothing. Two are not.',
    accept: { label: 'Go through it', fx: { rating: 1 }, diary: 'you went back through the old folder and found two things worth finishing.' },
    pass: { label: 'Start fresh', fx: {}, diary: null } },
  {
    id: 'o_stay_current', cls: 'COMMON', title: 'The new thing', repeatable: true, weight: 2,
    req: { age: [22, 50] },
    body: () => 'Something changed in the last eighteen months and you can hear that you are not doing it. You could learn it or decide not to.',
    accept: { label: 'Learn it', fx: { rating: 1 }, diary: 'you learned the thing everyone younger was already doing and stopped sounding dated.' },
    pass: { label: 'Stay yourself', fx: {}, diary: null } },
  {
    id: 'o_take_the_year', cls: 'COMMON', title: 'A year off', repeatable: true, weight: 1,
    req: { age: [26, 50] },
    body: () => 'You have not stopped since you were sixteen. You could stop.',
    accept: { label: 'Take it', fx: { rating: -1 }, diary: 'you took a year off and did not touch any of it, and came back wanting to.' },
    pass: { label: 'Keep going', fx: {}, diary: null } },
];
