# Basement

A short-session music producer career game. You start at 14 in a basement and
retire whenever you decide to — age 22 or age 50. About twelve decisions, all
of them compounding, none of them reversible. A run takes 6–10 minutes.

The hook is not the run. It is the trophy cabinet that persists across every
run you have ever played.

**No seeds, no daily puzzle, no schedule.** Every run deals a fresh deck. Open
it whenever you want and play for as long as you want.

```bash
npm install
npm run dev
```

Then open http://localhost:5273.

---

## Architecture

Content is fully separated from mechanics. You can rewrite every word in
`src/content/` without touching a line of game logic.

```
src/
  content/          pure data — no imports from engine/
    roster.js       artists by tier + territory. Swap/localize freely.
    cards.js        93 opportunity cards across 4 classes
    diary.js        focus lines, condition lines, retirement lines
  engine/
    game.js         turn loop, stat math, deck, awards, certifications
    status.js       the six-tier fame ladder + the Architect route
    rng.js          seeded PRNG (mulberry32) + daily seed
  ui/
    careerCard.js   canvas render of the shareable career card
  App.jsx           all screens
  persist.js        localStorage — the cabinet is the only thing saved
scripts/
  sim.mjs           headless balance harness
  peak.mjs          diagnostic: when does a strong run reach each tier
```

### The one rule that governs the deck

Randomness lives only in **which eligible card is drawn**, never in whether a
choice works. Accepting a card never rolls dice. The game has exactly three
hidden rolls, and the fiction declares all of them up front:

- a manager's honesty, rolled at signing and revealed six years later
- award wins, weighted against Taste and Relevance
- certification levels, resolved 1–2 turns after the placement

If outcomes felt like a slot machine, nobody would replay.

### Stats

Five visible stats: Skill, Taste, Relevance, Connections, Cash.

Relevance does **not** drain in the 14–22 band. At sixteen nobody knows you
either way, and telling the player otherwise is a lie they can check. The
drain starts in your twenties and bites after 34, where Relevance decays
every turn automatically.

### The two routes to the top

The fame ladder tops out at LEGENDARY PRODUCER (Relevance 85 + Taste 75 +
proof). The **underground track is a parallel route, not a lower tier** — high
Taste, low Relevance, near-zero Cash. A run built entirely on underground work
can qualify as the Architect (see `isArchitect` in `status.js`) while never
passing NATIONAL on the fame ladder, and the status bar marks it with a
second chip: THE UNDERGROUND CANON.

---

## Balance harness

Before changing any number in `game.js`, run:

```bash
node scripts/sim.mjs 6000
```

Nine archetype strategies play full runs. The output flags any white whale
that never got seen (`!!`) and any card that never gets drawn. Current state:

| | |
|---|---|
| White whales reachable | 8 / 8 |
| Cards drawn at least once | 103 / 103 |
| Diamond plaques | ~1 per 41 runs |
| Runs ending in the red | ~24% |

Deck: 60 COMMON · 15 CONTRACT · 20 RARE · 8 WHITE WHALE. Roster: 153 names.

`node scripts/peak.mjs` answers the separate question of *when* a strong run
reaches each tier — the number that matters most is how many turns are left
after reaching LEGENDARY, because voluntarily stopping at the top is the
whole point. If that window closes, the game's central tension ("retirement
is available from turn 1") stops meaning anything.

---

## Visual direction

Per `design_handoff_turn_screen`, the game is the **Photocopy / Y2K** hybrid,
not the paperwork-inspired "Session Log" direction from the original brief —
the handoff is explicit that the brief's recommendation was superseded.

That means: a full-bleed bedroom-studio photo under a `rgba(10,10,10,0.45)`
scrim and a 3px halftone dot-grain; white panels with `3px solid #111` borders
and no border-radius anywhere; Anton display type with a chrome bevel gradient
on numerals; JetBrains Mono labels; Courier Prime body copy; Permanent Marker
hand tags; diagonal red/white tape-splice striping; die-cut `clip-path` stars;
and `#C81E1E` as the only signal colour.

Where the handoff only covered the turn screen, the same language is extended
to the title, resolve, ending, and cabinet screens. Two deliberate departures,
both for contrast reasons the fixed 1920×1080 mock did not have to solve:

- **Die-cut stars in the footer are white, not black.** The mock puts black
  stars on a mid-tone photo; on the darkened scrim black would disappear.
- **The turn screen shows the tracklist and the opportunity together**, as the
  mock does, but the opportunity panel only populates *after* a focus is
  picked — otherwise you would be choosing your two years already knowing what
  the card is, which breaks the core decision.

The bedroom-studio photo was not supplied in the bundle, so
`src/ui/Backdrop.jsx` is a drawn SVG stand-in tuned to survive the scrim.
Swapping in a real photo is a one-line change documented at the top of that file.

## Determinism

There is no player-facing seed. Each run generates a private one internally so
a single run's draws stay stable while it plays; it is never shown, never
entered, and never shared.

---

## Before any public launch

The spec flagged this and it is still true: **GRAMMY, OSCAR, and EMMY are
trademarks, and Gold/Platinum/Diamond plaque designations are RIAA marks.**
They are fine in a private test build and must be renamed before you ship
publicly. They are confined to:

- `src/engine/game.js` — `GRAMMY_CATEGORIES`, and the `kind` strings in
  `resolveAwards`
- `src/App.jsx` and `src/ui/careerCard.js` — display labels only

All artist names in `roster.js` are fictional. If you want to ship with real
artists you would be putting real people in a game as characters, which is its
own rights question — the file is structured so that swapping them is a
one-file change either way.
