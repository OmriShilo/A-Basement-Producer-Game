# Notices

The MIT licence in `LICENSE` covers the code and writing in this repository.
It cannot and does not grant rights to two things that are also in here.

## Third-party code

**three.js** — `src/rack/vendor/`, vendored rather than installed from npm so
the instrument modules stay pinned to a known-good copy. MIT, Copyright ©
2010–2026 three.js authors. The copyright header is preserved in
`three.module.js` and `three.core.js`; `RoomEnvironment.js` and
`RoundedBoxGeometry.js` are three.js addons under the same licence and are
unmodified. https://github.com/mrdoob/three.js

Everything else is a normal npm dependency and is MIT: React, React DOM, Vite,
`@vitejs/plugin-react`.

## Real names and real figures

`src/content/roster.js` names about 135 real recording artists and directors.
`src/content/labels.js` names fourteen real record labels.
`src/content/listeners.js` carries real Spotify monthly-listener figures,
captured 2026-08-26 from kworb.net's public tables.

None of that is licensed by this repository, because none of it is mine to
licence. It is used the way a fan project uses real names — nobody named here
has endorsed, reviewed or is involved in this game, and no affiliation is
claimed or implied.

Two things follow from that, and they matter more if this ever stops being a
personal project:

- **The label rosters are for the game, not documentation.** They list artists
  meaningfully associated with each house — signings and close collaborators
  both — and they are neither current nor complete. See the header of
  `labels.js`.
- **Monthly-listener figures are a snapshot and go stale.** They are display
  only; tier drives every mechanic, so a figure drifting out of date costs
  accuracy on screen and nothing else.

An MIT licence lets someone else redistribute this repository. It does not give
them — or me — any right to the names inside it. Anyone doing anything
commercial with this should get that looked at properly first.
