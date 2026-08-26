import React, { useEffect, useRef, useState } from 'react';
import {
  TURNS, START_AGE, END_AGE, START_YEAR,
  createRun, beginYear, resolveYear, advance, retire, offerIsRack, gambleChance, cardVars,
  mergeIntoCabinet, shareText, overallRating, ratingTier,
} from './engine/game.js';
/* The rack drags three.js behind it — about 700kB, roughly eight times the rest
   of the game. Loaded eagerly it would sit in front of the title screen for
   every player, including the ones who never open it, so it is split out and
   fetched the first time a year is actually spent at the keys. */
const Rack = React.lazy(() => import('./ui/Rack.jsx'));
import { STANDING, isArchitect } from './engine/status.js';
import { labelStatus } from './engine/labels.js';
import { PRODIGY_AT } from './engine/rating.js';
import { ROSTER, BILLBOARD_CHARTS, listenersOf } from './content/roster.js';
import { formatListeners } from './content/listeners.js';
import { loadCabinet, saveCabinet, wipeCabinet } from './persist.js';
import { drawCareerCard, downloadCanvas } from './ui/careerCard.js';

const ROSTER_ARTISTS = Object.values(ROSTER).flat();
const ROSTER_TOTAL = ROSTER_ARTISTS.length;

/** How many detail rows the log shows before older years fold away. */
const LOG_ROWS = 6;

/**
 * How big the act on a credit is, in the unit a player actually feels.
 *
 * Monthly listeners rather than the internal tier number. Credits that are not
 * a roster artist — a television series, a short film — have no listener count,
 * so they say what kind of credit they are instead of printing a hole.
 */
function creditSize(p) {
  const n = listenersOf(p.artist);
  if (n === null) return p.underground ? 'UNDERGROUND' : 'CREDIT';
  const shown = `${formatListeners(n)} MONTHLY`;
  return p.underground ? `UNDERGROUND · ${shown}` : shown;
}

/**
 * SIGNED TO — the contract indicator.
 *
 * A deal is the only state in the game that persists across years, so unlike
 * everything else on the header it has to say how much of it is left. The pips
 * are the term: filled for years served, hollow for years still owed. Reads as
 * a countdown without needing to be one.
 */
function SignedTo({ s }) {
  const l = labelStatus(s);
  if (!l.signed) {
    return (
      <div>
        <div className="lbl">Signed to</div>
        <div className="val indie">Independent</div>
      </div>
    );
  }
  return (
    <div>
      <div className="lbl">Signed to</div>
      <div className="val label-name" title={`${l.left} of ${l.years} years left`}>{l.name}</div>
      <div className="term" aria-label={`${l.left} of ${l.years} years left`}>
        {Array.from({ length: l.years }).map((_, i) => (
          <i key={i} className={i < l.years - l.left ? 'served' : ''} />
        ))}
      </div>
    </div>
  );
}

const PLAQUE_ORDER = [
  ['gold', 'GOLD'],
  ['platinum', 'PLATINUM'],
  ['multi', 'MULTI'],
  ['diamond', 'DIAMOND'],
];

/** A trophy is any lockable career milestone: a plaque tier, an award, a chart, Loyal Producer. */
function trophyCount(c) {
  const flags = [
    c.certs.gold > 0, c.certs.platinum > 0, c.certs.multi > 0, c.certs.diamond > 0,
    c.grammyWins > 0, c.oscarWins > 0, c.emmyWins > 0,
    (c.loyalProducer || []).length > 0,
  ];
  return {
    unlocked: flags.filter(Boolean).length + (c.chartsLanded || []).length,
    total: flags.length + BILLBOARD_CHARTS.length,
  };
}

const sumPlaques = (p) => p.gold + p.platinum + p.multi + p.diamond;

/* ================================================================== */

export default function App() {
  const [cabinet, setCabinet] = useState(loadCabinet);
  const [screen, setScreen] = useState('title');
  const [run, setRun] = useState(null);
  const [name, setName] = useState('');

  const push = (r) => setRun({ ...r });

  function start() {
    const r = createRun(cabinet);
    beginYear(r);
    setRun(r);
    setScreen('run');
  }

  function finish(r) {
    const merged = mergeIntoCabinet(cabinet, r);
    setCabinet(merged);
    saveCabinet(merged);
  }

  let view;
  if (screen === 'cabinet') {
    view = (
      <Cabinet
        cabinet={cabinet}
        onBack={() => setScreen(run && run.phase !== 'end' ? 'run' : 'title')}
        onWipe={() => setCabinet(wipeCabinet())}
      />
    );
  } else if (screen === 'title' || !run) {
    view = <Title cabinet={cabinet} name={name} setName={setName} onStart={start} onCabinet={() => setScreen('cabinet')} />;
  } else {
    view = (
      <Run
        run={run} name={name} push={push} onFinish={finish}
        onCabinet={() => setScreen('cabinet')}
        onTitle={() => { setRun(null); setScreen('title'); }}
      />
    );
  }

  return (
    <>
      <div className="gridlines" />
      {view}
    </>
  );
}

/* ================================================================== */
/* TITLE                                                              */
/* ================================================================== */

function Title({ cabinet, name, setName, onStart, onCabinet }) {
  const t = trophyCount(cabinet);
  return (
    <div className="page">
      <div className="panel pad accent">
        <div className="lbl wide" style={{ marginBottom: 12 }}>A music producer career sim</div>
        <div className="title-mark">A Basement Producer Game</div>
      </div>

      <div className="grid2" style={{ flex: 1 }}>
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="lbl wide" style={{ marginBottom: 18 }}>Side A — the pitch</div>
          <p className="body-copy" style={{ marginTop: 0, fontSize: 'clamp(14px,1.15vw,21px)' }}>
            You are sixteen, in the basement of a three-bedroom house, with a cracked DAW and a
            laptop that overheats. One turn is one year. Every year puts two things in front of
            you and you may take exactly one.
          </p>
          <p className="note">
            Whichever you pass on will not come back. You can retire in any year. After
            thirty-four the years start taking things back on their own.
          </p>
          <div className="footbar" style={{ marginTop: 'auto' }}>
            <button className="btn solid" onClick={onStart}>Play now</button>
            <button className="btn" onClick={onCabinet}>Trophy cabinet</button>
          </div>
        </div>

        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="lbl wide" style={{ marginBottom: 18 }}>Credits — your name</div>
          <input
            className="field"
            value={name}
            maxLength={28}
            placeholder="what goes in the credits"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="note" style={{ marginTop: 16 }}>
            No seeds, no daily puzzle, no schedule. Every run rolls fresh talent and deals a
            fresh deck.
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <div className="lbl wide" style={{ marginBottom: 12 }}>Career so far</div>
            <table className="tab">
              <tbody>
                <tr><td>Runs played</td><td>{cabinet.runs}</td></tr>
                <tr><td>Best overall</td><td>{cabinet.bestRating || '—'}</td></tr>
                <tr><td>Longest career</td><td>{cabinet.longestCareer ? `${cabinet.longestCareer} years` : '—'}</td></tr>
                <tr><td>Artist album</td><td>{(cabinet.artistsPlaced || []).length} / {ROSTER_TOTAL}</td></tr>
                <tr><td>Trophies</td><td>{t.unlocked} / {t.total}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* RUN                                                                */
/* ================================================================== */

function Run({ run: s, name, push, onFinish, onCabinet, onTitle }) {
  // Index of the rack offer being played, or null. The year is not committed
  // until the session ends, so this sits outside the engine — the run state
  // stays exactly where it was while you play.
  const [rackPick, setRackPick] = useState(null);

  function commit(i, extra) {
    resolveYear(s, i, extra);
    advance(s);
    if (s.phase === 'end') onFinish(s);
    push(s);
  }
  function choose(i) {
    if (s.phase !== 'choose') return;
    if (offerIsRack(s.offers[i])) { setRackPick(i); return; }
    commit(i, {});
  }
  function leaveRack(result) {
    const i = rackPick;
    setRackPick(null);
    commit(i, { rack: result });
  }
  function doRetire() {
    if (s.phase === 'end') return;
    retire(s, true);
    onFinish(s);
    push(s);
  }

  if (s.phase === 'end') {
    return <EndScreen s={s} name={name} onCabinet={onCabinet} onTitle={onTitle} />;
  }
  if (rackPick !== null) {
    return (
      <React.Suspense fallback={<div className="rack-loading">Opening the rack…</div>}>
        <Rack year={TURNS[s.turn].year} age={s.age} onDone={leaveRack} />
      </React.Suspense>
    );
  }
  return <CareerReview s={s} onChoose={choose} onRetire={doRetire} onCabinet={onCabinet} />;
}

/* ---------- the career review turn screen ---------- */

function CareerReview({ s, onChoose, onRetire, onCabinet }) {
  const turn = TURNS[s.turn];
  const totals = s.certs;
  const plaqueTotal = sumPlaques(totals);
  const awardsWon = s.awards.grammyWins + s.awards.oscarWins + s.awards.emmyWins;

  const detail = s.log.slice(-LOG_ROWS);
  const folded = s.log.slice(0, Math.max(0, s.log.length - LOG_ROWS));
  const prev = s.log.length ? s.log[s.log.length - 1] : null;
  const delta = s.report ? s.report.ratingMove : 0;
  const ovr = overallRating(s);

  return (
    <div className="screen">
      <div className="screen-l">
        {/* header */}
        <div className="headrow">
          {/* Age is the whole clock. The calendar year and the "year N of
              playing" counter were both restatements of it — one turn is one
              year, so all three moved together and only one of them is the
              number you actually think in. */}
          <div className="headrow-l">
            <div>
              <div className="lbl" style={{ marginBottom: 7 }}>Age</div>
              <div className="age-num glow-green">{s.age}</div>
            </div>
          </div>
          <div className="headrow-r">
            <div>
              <div className="lbl">Standing</div>
              <div className="val">{STANDING}</div>
            </div>
            <SignedTo s={s} />
            <div>
              <div className="lbl">Credits</div>
              <div className="val" style={{ color: 'var(--green)' }}>{s.placements.length}</div>
            </div>
            <div>
              <div className="lbl">Plaques</div>
              <div className="val" style={{ color: 'var(--amber)' }}>{plaqueTotal}</div>
            </div>
          </div>
        </div>

        {/* the years so far */}
        <div className="log">
          <div className="log-cols">
            <span className="c-age">Age</span>
            <span className="c-act" style={{ fontFamily: 'var(--mono)', fontSize: 'inherit' }}>What you did</span>
            <span className="c-plq">Plaques</span>
            <span className="c-awd">Awards</span>
            <span className="c-out">How it landed</span>
          </div>

          {folded.length > 0 && (
            <div className="log-collapsed">
              + age {folded[0].age} — {folded[folded.length - 1].age} &nbsp; {folded.length} earlier {folded.length === 1 ? 'year' : 'years'}
            </div>
          )}

          <div className="log-rows">
            {detail.length === 0 && (
              <div className="log-row">
                <span className="c-out v-neutral" style={{ width: 'auto' }}>
                  Nothing has happened yet. That is what year one is.
                </span>
              </div>
            )}
            {detail.map((e) => (
              <div className={`log-row${e.valence === 'standout' ? ' standout' : ''}`} key={e.year}>
                <span className={`c-age${e.valence === 'standout' ? ' v-standout-age' : ''}`}>{e.age}</span>
                <span className={`c-act${e.valence === 'standout' ? ' v-standout' : ''}`}>{e.action}</span>
                <span className="c-plq"><Plaques p={e.plaques} /></span>
                <span className="c-awd"><Awards list={e.awards} /></span>
                <span className={`c-out v-${e.valence}`}>{e.outcome}</span>
              </div>
            ))}
          </div>

          <div className="log-foot">
            {PLAQUE_ORDER.filter(([k]) => totals[k] > 0).map(([k, label]) => (
              <span className="plq-grp" key={k}>
                <i className={`mark ${k}`} />
                <span>{label} {totals[k]}</span>
              </span>
            ))}
            {plaqueTotal === 0 && <span>No plaques yet</span>}
            <span className="foot-right">{awardsWon} {awardsWon === 1 ? 'award' : 'awards'} won</span>
          </div>
        </div>

        {/* on tape */}
        <OnTape placements={s.placements} />
      </div>

      {/* right rail */}
      <div className="screen-r">
        <div className={`ovr${s.prodigy && !s.plateaued ? ' prodigy' : ''}`}>
          <div className="ovr-top">
            <div>
              <div className="lbl wide" style={{ marginBottom: 10 }}>Current OVR</div>
              <div className="ovr-num">{ovr}</div>
            </div>
            <div className="ovr-delta">
              <div className={`d ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
              </div>
              <div className="ovr-since">
                {prev ? `since ${prev.year}` : `started at ${s.talent}`}
              </div>
            </div>
          </div>
          <div className="ovr-bar">
            {Array.from({ length: 10 }).map((_, i) => (
              <i key={i} className={i < Math.round(ovr / 10) ? 'on' : ''} />
            ))}
          </div>
          <TalentLine s={s} />
        </div>

        <div className="pick">
          <div className="lbl">{turn.year} — choose one</div>
          {s.offers.map((o, i) => {
            // Green or yellow. A yellow card prints the odds it is about to
            // roll, which is the whole difference between the two: you are
            // never shown what a card pays, but you are always shown what it
            // risks.
            const chance = gambleChance(o.card, o.cast);
            const isGamble = chance !== null;
            return (
              <div className={`opt${i === 1 ? ' b' : ''}${isGamble ? ' gamble' : ''}`} key={o.card.id}>
                <div className="opt-head">
                  <span className="opt-no">{String(i + 1).padStart(2, '0')}</span>
                  <div className="opt-title">{o.card.accept.label}</div>
                  {isGamble && (
                    <span className="opt-odds" title="Chance this works out">
                      {Math.round(chance * 100)}%
                    </span>
                  )}
                </div>
                <div className="opt-body">{o.card.body(cardVars(o, s.age))}</div>
                {isGamble && (
                  <div className="opt-risk">
                    {Math.round(chance * 100)}% it lands · {Math.round((1 - chance) * 100)}% it goes wrong
                  </div>
                )}
                <button className="opt-btn" onClick={() => onChoose(i)}>Select</button>
              </div>
            );
          })}
          <div className="warn">Whichever you pass on will not come back.</div>
          <div className="footbar">
            <button className="btn quiet" onClick={onCabinet}>Cabinet</button>
            <span className="spacer" />
            <button className="btn danger" onClick={onRetire}>Retire at {s.age}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TalentLine({ s }) {
  if (s.plateaued) {
    return (
      <div className="talent-line off">
        <b>LEVELLED OFF</b><br />
        A prodigy until {s.plateauedAt}. Now a producer.
      </div>
    );
  }
  if (s.prodigy) {
    return (
      <div className="talent-line">
        <b>PRODIGY</b><br />
        Opened at {s.talent}. You learn faster than the room.
      </div>
    );
  }
  return (
    <div className="talent-line">
      Opened at {s.talent}. {s.talent <= 55 ? 'Nobody is waiting on you.' : 'Room to work with.'}
    </div>
  );
}

function Plaques({ p }) {
  const groups = PLAQUE_ORDER.filter(([k]) => p[k] > 0);
  if (!groups.length) return <span className="c-none">—</span>;
  return (
    <>
      {groups.map(([k]) => (
        <span className="plq-grp" key={k}>
          <i className={`mark ${k}`} />
          <span className="plq-n" style={{ color: k === 'gold' ? 'var(--amber)' : k === 'diamond' ? 'var(--diamond)' : 'var(--platinum)' }}>
            {p[k]}
          </span>
        </span>
      ))}
    </>
  );
}

function Awards({ list }) {
  if (!list || !list.length) return <span className="c-none">—</span>;
  return (
    <>
      {list.map((a) => (
        <span className="awd" key={a.type}>
          {/* typographic placeholders — real award marks are trademarked */}
          <span className={`awd-box ${a.type}`}>{a.type}</span>
          <span className="awd-n">{a.count}</span>
        </span>
      ))}
    </>
  );
}

function OnTape({ placements }) {
  const shown = [...placements].sort((a, b) => b.tier - a.tier || b.age - a.age).slice(0, 5);
  const more = Math.max(0, placements.length - shown.length);
  const statusOf = (p) => {
    if (p.underground) return ['TAPE', 'var(--text-dimmer)'];
    if (p.tier >= 5) return ['FLAGSHIP ★', 'var(--amber)'];
    if (p.tier === 4) return ['MAJOR', 'var(--green)'];
    if (p.tier === 3) return ['ALBUM', 'var(--green)'];
    if (p.tier === 2) return ['SINGLE', 'var(--text-dimmer)'];
    return ['DEMO', 'var(--text-dimmer)'];
  };
  return (
    <div className="tape">
      <div className="tape-cap">
        <span className="lbl">On tape</span>
        <span className="tape-sub">{placements.length} {placements.length === 1 ? 'credit' : 'credits'}</span>
      </div>
      {shown.length === 0 && <div className="tape-empty">Nothing on tape yet.</div>}
      {shown.map((p, i) => {
        const [label, color] = statusOf(p);
        return (
          <div className="tape-cell" key={`${p.artist}-${p.age}-${i}`}>
            <span className="tape-title" style={p.tier <= 2 ? { color: 'var(--text-dim)' } : undefined}>{p.artist}</span>
            <span className="tape-meta" style={{ color }}>{START_YEAR + p.turn} · {label}</span>
          </div>
        );
      })}
      {more > 0 && <div className="tape-more">+ {more} more</div>}
    </div>
  );
}

/* ================================================================== */
/* END                                                                */
/* ================================================================== */

function EndScreen({ s, name, onCabinet, onTitle }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current) drawCareerCard(canvasRef.current, s, name);
  }, [s, name]);

  const a = s.awards;
  const c = s.certs;
  const loyal = s.loyalProducerThisRun || [];

  return (
    <div className="page">
      <div className="panel pad accent">
        <div className="lbl wide" style={{ marginBottom: 12 }}>The end of the run</div>
        <div className="title-mark">
          {s.voluntary ? `You stopped at ${s.retiredAge}` : 'You turned fifty still working'}
        </div>
      </div>

      <div className="grid2">
        <div className="panel pad">
          <div className="lbl wide" style={{ marginBottom: 18 }}>Liner notes</div>
          <p className="body-copy" style={{ marginTop: 0 }}>
            {s.voluntary
              ? `${s.retiredAge - START_AGE} years in, and you chose the moment. `
              : `Thirty-four years, start to finish. The decision made itself some time ago. `}
            {s.prodigy && !s.plateaued && 'You opened as a prodigy and never stopped climbing. '}
            {s.plateaued && `You opened as a prodigy and levelled off at ${s.plateauedAt}. `}
            {isArchitect(s) && 'The record collectors know exactly who you are. Nobody else does.'}
          </p>
          <div style={{ marginTop: 22 }}>
            <div className="lbl wide" style={{ marginBottom: 10 }}>Final overall</div>
            <div className="score-num">{overallRating(s)}</div>
            <div className="lbl" style={{ marginTop: 10 }}>{ratingTier(overallRating(s))} · opened at {s.talent}</div>
          </div>
        </div>

        <div className="panel pad">
          <div className="lbl wide" style={{ marginBottom: 18 }}>The record</div>
          <table className="tab">
            <tbody>
              <tr><td>Years worked</td><td>{s.retiredAge - START_AGE}</td></tr>
              <tr><td>Credits</td><td>{s.placements.length}</td></tr>
              <tr><td>Gold / platinum</td><td>{c.gold} / {c.platinum}</td></tr>
              <tr><td>Multi / diamond</td><td>{c.multi} / {c.diamond}</td></tr>
              <tr><td>Grammy — won / nominated</td><td>{a.grammyWins} / {a.grammyNoms}</td></tr>
              <tr><td>Oscar — won / nominated</td><td>{a.oscarWins} / {a.oscarNoms}</td></tr>
              <tr><td>Emmy — won / nominated</td><td>{a.emmyWins} / {a.emmyNoms}</td></tr>
              <tr><td>Score</td><td>{s.score.toLocaleString()}</td></tr>
            </tbody>
          </table>
          {loyal.length > 0 && (
            <div className="note" style={{ marginTop: 16, color: 'var(--amber)' }}>
              ★ Loyal Producer — you kept going back to {loyal.join(', ')}.
            </div>
          )}
        </div>
      </div>

      {s.placements.length > 0 && (
        <div className="panel pad">
          <div className="lbl wide" style={{ marginBottom: 14 }}>Credits</div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {s.placements.map((p, i) => (
              <div className="entry" key={i}>
                <span className="who">{p.artist}</span>
                <span className="meta">
                  {creditSize(p)}{p.score ? ' · SCORE' : ''} · {START_YEAR + p.turn}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid2">
        <div className="panel pad">
          <div className="lbl wide" style={{ marginBottom: 14 }}>Share it</div>
          <textarea className="share" rows={7} readOnly value={shareText(s)} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="footbar">
            <button className="btn" onClick={() => canvasRef.current && downloadCanvas(canvasRef.current, 'basement-career.png')}>
              Download card
            </button>
          </div>
        </div>
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="lbl wide" style={{ marginBottom: 14 }}>Again</div>
          <div className="note">Fresh talent, fresh deck. Nothing carries over but the cabinet.</div>
          <div className="footbar" style={{ marginTop: 'auto' }}>
            <button className="btn solid" onClick={onTitle}>Run it again</button>
            <button className="btn" onClick={onCabinet}>Trophy cabinet</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* CABINET                                                            */
/* ================================================================== */

function Plaque({ tier, label, count }) {
  const earned = count > 0;
  return (
    <div className={`plaque ${tier}${earned ? '' : ' locked'}`}>
      <i className={`mark ${tier}`} />
      <div>
        <div className="plaque-label">{label}</div>
        <div className="plaque-count">{earned ? `×${count}` : '—'}</div>
      </div>
    </div>
  );
}

function Cabinet({ cabinet: c, onBack, onWipe }) {
  const avgAge = c.retirementAges.length
    ? Math.round(c.retirementAges.reduce((a, b) => a + b, 0) / c.retirementAges.length) : 0;
  const artistsPlaced = c.artistsPlaced || [];
  const loyalProducer = c.loyalProducer || [];
  const chartsLanded = c.chartsLanded || [];
  const t = trophyCount(c);

  return (
    <div className="page">
      <div className="panel pad accent" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="lbl wide" style={{ marginBottom: 12 }}>Lifetime</div>
          <div className="title-mark">Trophy cabinet</div>
        </div>
        <button className="btn" onClick={onBack}>Back</button>
      </div>

      <div className="grid2">
        <div className="panel pad">
          <div className="lbl wide" style={{ marginBottom: 18 }}>The record</div>
          <table className="tab">
            <tbody>
              <tr><td>Runs played</td><td>{c.runs}</td></tr>
              <tr><td>Best overall ever</td><td>{c.bestRating || '—'}</td></tr>
              <tr><td>Average retirement age</td><td>{avgAge || '—'}</td></tr>
              <tr><td>Longest career</td><td>{c.longestCareer ? `${c.longestCareer} years` : '—'}</td></tr>
              <tr><td>Trophies</td><td>{t.unlocked} / {t.total}</td></tr>
              <tr><td>Grammy — won / nominated</td><td>{c.grammyWins} / {c.grammyNoms}</td></tr>
              <tr><td>Oscar — won / nominated</td><td>{c.oscarWins} / {c.oscarNoms}</td></tr>
              <tr><td>Emmy — won / nominated</td><td>{c.emmyWins} / {c.emmyNoms}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="panel pad">
          <div className="lbl wide" style={{ marginBottom: 18 }}>Certified plaques</div>
          <div className="plaquerow">
            <Plaque tier="gold" label="Gold" count={c.certs.gold} />
            <Plaque tier="platinum" label="Platinum" count={c.certs.platinum} />
            <Plaque tier="multi" label="Multi-platinum" count={c.certs.multi} />
            <Plaque tier="diamond" label="Diamond" count={c.certs.diamond} />
          </div>
        </div>
      </div>

      <div className="panel pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
          <div className="lbl wide">Artist album</div>
          <div className="lbl">{artistsPlaced.length} / {ROSTER_TOTAL}</div>
        </div>
        <div className="dexgrid">
          {ROSTER_ARTISTS.map((a, i) => {
            const unlocked = artistsPlaced.includes(a.name);
            return (
              <div className={`dexcell${unlocked ? '' : ' locked'}`} key={`${a.name}-${i}`}>
                <div className="dexnum">#{String(i + 1).padStart(3, '0')}</div>
                {unlocked ? (
                  <>
                    <div className="dexname">{a.name}</div>
                    <div className="dexmeta">{a.genre}</div>
                  </>
                ) : <div className="dexblack">?????</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
          <div className="lbl wide">Billboard #1 producer</div>
          <div className="lbl">{chartsLanded.length} / {BILLBOARD_CHARTS.length}</div>
        </div>
        <div className="dexgrid" style={{ maxHeight: 'none' }}>
          {BILLBOARD_CHARTS.map((g, i) => {
            const unlocked = chartsLanded.includes(g);
            return (
              <div className={`dexcell${unlocked ? '' : ' locked'}`} key={g}>
                <div className="dexnum">#{String(i + 1).padStart(3, '0')}</div>
                {unlocked ? <div className="dexname">{g.toUpperCase()}</div> : <div className="dexblack">?????</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
          <div className="lbl wide">Loyal producer</div>
          <div className="lbl">{loyalProducer.length}</div>
        </div>
        {loyalProducer.length === 0 ? (
          <div className="note">Keep going back to the same artist inside a single run. The threshold moves every run.</div>
        ) : (
          <div className="slots">
            {loyalProducer.map((n) => (
              <div className="slot" key={n}>
                <div className="sname">{n}</div>
                <div className="ssub">★ Loyal producer</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="footbar">
        <span className="spacer" />
        <button
          className="btn danger"
          onClick={() => { if (confirm('Erase the entire cabinet? This cannot be undone.')) onWipe(); }}
        >
          Erase cabinet
        </button>
      </div>
    </div>
  );
}
