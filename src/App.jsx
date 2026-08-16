import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TURNS, END_AGE, FOCUSES, createRun, setFocus, resolveTurn, advance, retire,
  mergeIntoCabinet, shareText,
} from './engine/game.js';
import { STATUS, REQUIREMENT_TEXT, isArchitect } from './engine/status.js';
import { bandOf } from './content/diary.js';
import { ROSTER, BILLBOARD_CHARTS } from './content/roster.js';
import { TERRITORY_UNLOCK, TERRITORY_NAME } from './content/roster.js';
import { loadCabinet, saveCabinet, wipeCabinet } from './persist.js';
import { drawCareerCard, downloadCanvas } from './ui/careerCard.js';
import Backdrop from './ui/Backdrop.jsx';

const money = (n) => (n < 0 ? `−$${Math.abs(n).toLocaleString()}` : `$${n.toLocaleString()}`);
const SHORT_STATUS = ['', 'BEDROOM', 'LOCAL', 'KNOWN', 'NATIONAL', 'INTERNATIONAL', 'LEGENDARY'];
const ROSTER_ARTISTS = Object.values(ROSTER).flat();
const ROSTER_TOTAL = ROSTER_ARTISTS.length;

/** A trophy is any lockable career milestone: a plaque tier, an award win, or Loyal Producer. */
function trophyCount(c) {
  const flags = [
    c.certs.gold > 0,
    c.certs.platinum > 0,
    c.certs.multi > 0,
    c.certs.diamond > 0,
    c.grammyWins > 0,
    c.oscarWins > 0,
    c.emmyWins > 0,
    (c.loyalProducer || []).length > 0,
  ];
  const chartsLanded = (c.chartsLanded || []).length;
  return { unlocked: flags.filter(Boolean).length + chartsLanded, total: flags.length + BILLBOARD_CHARTS.length };
}

/* ================================================================== */

export default function App() {
  const [cabinet, setCabinet] = useState(loadCabinet);
  const [screen, setScreen] = useState('title');
  const [run, setRun] = useState(null);
  const [name, setName] = useState('');

  const push = (r) => setRun({ ...r });

  function start() {
    setRun(createRun(cabinet));
    setScreen('run');
  }

  function finish(r) {
    const merged = mergeIntoCabinet(cabinet, r);
    setCabinet(merged);
    saveCabinet(merged);
  }

  let view;
  if (screen === 'cabinet') {
    view = <Cabinet cabinet={cabinet} onBack={() => setScreen(run && run.phase !== 'end' ? 'run' : 'title')} onWipe={() => setCabinet(wipeCabinet())} />;
  } else if (screen === 'title' || !run) {
    view = <Title cabinet={cabinet} name={name} setName={setName} onStart={start} onCabinet={() => setScreen('cabinet')} />;
  } else {
    view = (
      <Run
        run={run}
        name={name}
        cabinet={cabinet}
        push={push}
        onFinish={finish}
        onCabinet={() => setScreen('cabinet')}
        onTitle={() => { setRun(null); setScreen('title'); }}
      />
    );
  }

  return (
    <>
      <Backdrop />
      {view}
    </>
  );
}

/* ================================================================== */
/* SHARED PARTS                                                        */
/* ================================================================== */

function Star({ on, className = '' }) {
  return <span className={`star${on ? ' on' : ''} ${className}`}>★</span>;
}

function Meter({ level, max = 5, hot }) {
  return (
    <div className={`meter${hot ? ' hot' : ''}`}>
      {Array.from({ length: max }).map((_, i) => (
        <i key={i} className={i < level ? 'on' : ''} style={{ height: 12 + i * 6 }} />
      ))}
    </div>
  );
}

function Segs({ value, hot }) {
  const on = Math.round(value / 10);
  return (
    <div className={`segs${hot ? ' hot' : ''}`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <i key={i} className={i < on ? 'on' : ''} />
      ))}
    </div>
  );
}

/** The certification badge from the design, showing the real plaque tally. */
function CertBadge({ certs }) {
  const order = [['diamond', 'DIAMOND'], ['multi', 'MULTI-PLATINUM'], ['platinum', 'PLATINUM'], ['gold', 'GOLD']];
  const top = order.find(([k]) => certs[k] > 0);
  const label = top ? `CERTIFIED ${top[1]}` : 'NO PLAQUES';
  const n = top ? certs[top[0]] : 0;
  return (
    <div className="badge">
      <span style={{ fontSize: 18 }}>★</span>
      <span className={`btext ${top ? 'chrome thin' : ''}`} style={!top ? { color: '#b4b4b4' } : undefined}>
        {label}{n > 1 ? ` ×${n}` : ''}
      </span>
    </div>
  );
}

function Bling({ children, certs, tag }) {
  return (
    <div className="bling">
      {/* white die-cuts: the design puts black stars on a mid-tone photo, but
          these sit on the darkened scrim where black would disappear */}
      <div className="diecut white" />
      <CertBadge certs={certs} />
      <div className="diecut sm white" />
      {tag && <span className="marker onphoto" style={{ fontSize: 'clamp(22px,2.6vw,42px)', transform: 'rotate(-4deg)' }}>{tag}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 22, alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function StatBlock({ s, deltas }) {
  const d = deltas || {};
  const rows = [
    ['Skill', s.skill, d.skill],
    ['Taste', s.taste, d.taste],
    ['Relevance', s.relevance, d.relevance],
    ['Connections', s.connections, d.connections],
  ];
  return (
    <div>
      {rows.map(([label, v, delta]) => (
        <div className="statrow" key={label}>
          <span className="statname">{label}</span>
          <Segs value={v} hot={delta > 0} />
          <span className="statdelta">
            {delta ? <span className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '+' : ''}{delta}</span>
              : <span className="statval">{v}</span>}
          </span>
        </div>
      ))}
      <div className="statrow">
        <span className="statname">Cash</span>
        <span className="statval" style={{ flex: 1, minWidth: 0, color: s.cash < 0 ? 'var(--signal)' : undefined }}>
          {money(s.cash)}
        </span>
        <span className="statdelta">
          {d.cash ? <span className={d.cash > 0 ? 'up' : 'down'}>{d.cash > 0 ? '+' : '−'}${Math.abs(d.cash).toLocaleString()}</span> : null}
        </span>
      </div>
    </div>
  );
}

/* ================================================================== */
/* TITLE                                                               */
/* ================================================================== */

function Title({ cabinet, name, setName, onStart, onCabinet }) {
  return (
    <div className="stage">
      <div className="panel pad">
        <div className="age-num" style={{ fontSize: 'clamp(32px, 6vw, 64px)' }}>A BASEMENT PRODUCER GAME</div>
      </div>

      <div className="mainrow">
        <div className="col-wide">
          <div className="splice ink" />
          <div className="spliced-body">
            <div className="splice-label">★ Side A — the pitch</div>
            <p className="body-copy" style={{ marginTop: 0 }}>
              You are fourteen, in the basement of a three-bedroom house, with a cracked DAW and a
              laptop that overheats. You will make about twelve decisions. All of them compound and
              none of them come back.
            </p>
            <p className="body-copy sm">
              You can retire on the very first turn. Retiring locks in everything you have.
              Continuing risks it. After thirty-four, the world starts taking things back.
            </p>
            <div className="actions">
              <button className="hit" onClick={onStart}>Beginning</button>
              <button className="hit no" onClick={onCabinet}>Trophy cabinet</button>
            </div>
          </div>
        </div>

        <div className="col-side">
          <div className="splice" />
          <div className="spliced-body">
            <div className="splice-label">★ Credits — your name</div>
            <input
              className="field"
              value={name}
              maxLength={28}
              placeholder="what goes in the credits"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="note" style={{ marginTop: 14 }}>
              No seeds, no daily puzzle, no schedule. Every run deals a fresh deck. Play whenever
              you want, for as long as you want.
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 24 }}>
              <div className="mono sm" style={{ marginBottom: 10 }}>Career so far</div>
              <table className="tab">
                <tbody>
                  <tr><td>Runs played</td><td>{cabinet.runs}</td></tr>
                  <tr><td>Artist Album</td><td>{(cabinet.artistsPlaced || []).length} / {ROSTER_TOTAL}</td></tr>
                  <tr><td>Trophies</td><td>{trophyCount(cabinet).unlocked} / {trophyCount(cabinet).total}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Bling certs={cabinet.certs} tag="demo tape" />
    </div>
  );
}

/* ================================================================== */
/* RUN                                                                 */
/* ================================================================== */

function Run({ run, name, cabinet, push, onFinish, onCabinet, onTitle }) {
  const s = run;

  const retireAge = s.phase === 'resolve'
    ? Math.min(END_AGE, TURNS[s.turn].age + TURNS[s.turn].span)
    : s.age;

  function doRetire() {
    s.age = retireAge;
    retire(s, true);
    onFinish(s);
    push(s);
  }
  function doFocus(f) { setFocus(s, f); push(s); }
  function doChoice(c) { resolveTurn(s, c); push(s); }
  function doAdvance() {
    const before = s.phase;
    advance(s);
    if (s.phase === 'end' && before !== 'end') onFinish(s);
    push(s);
  }

  if (s.phase === 'end') return <EndScreen s={s} name={name} onCabinet={onCabinet} onTitle={onTitle} />;

  return (
    <div className="stage">
      <Header s={s} />
      {s.phase === 'resolve'
        ? <ResolveScreen s={s} onNext={doAdvance} />
        : <TurnScreen s={s} cabinet={cabinet} onPick={doFocus} onChoice={doChoice} />}
      <Bling certs={s.certs} tag={money(s.cash)}>
        <button className="tick quiet" onClick={onCabinet}>Cabinet</button>
        <button className="tick" onClick={doRetire}>Retire at {retireAge}</button>
      </Bling>
    </div>
  );
}

function Header({ s }) {
  const t = TURNS[s.turn];
  const st = STATUS[s.status];
  const next = STATUS[s.status + 1];
  return (
    <div className="panel pad row">
      <div>
        <div className="mono" style={{ marginBottom: 4 }}>Age</div>
        <div className="age-num chrome">{s.age}</div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div className="stamp ink" style={{ background: st.color, color: '#fff', borderColor: st.color }}>
          {st.name}
        </div>
        {isArchitect(s) && (
          <div style={{ marginTop: 8 }}>
            <span className="stamp">Underground canon</span>
          </div>
        )}
        <div className="mono sub sm" style={{ marginTop: 12 }}>
          Turn {String(s.turn + 1).padStart(2, '0')} / {TURNS.length} · {t.span} years
        </div>
        <div className="note" style={{ marginTop: 6, maxWidth: 320 }}>
          {next ? `Next tier: ${REQUIREMENT_TEXT[next.level]}` : st.note}
        </div>
      </div>
    </div>
  );
}

/* ---------- the turn screen: tracklist + opportunity ---------- */

function TurnScreen({ s, cabinet, onPick, onChoice }) {
  const t = TURNS[s.turn];
  const band = bandOf(t.age);
  const picked = s.phase === 'card';
  const forced = s.forcedFocus;
  const order = ['CRAFT', 'HUSTLE', 'MONEY', 'LIFE'];

  return (
    <div className="mainrow">
      <div className="col-wide">
        <div className="tracklist">
          {order.map((key, i) => {
            const f = FOCUSES[key];
            const isPicked = s.focus === key;
            const disabled = picked ? !isPicked : !!forced && forced !== key;
            return (
              <button
                key={key}
                className="track"
                disabled={disabled || picked}
                onClick={() => !picked && onPick(key)}
              >
                <Star on={isPicked} />
                <span className="track-no">{String(i + 1).padStart(2, '0')}</span>
                <span className="track-title">
                  {f.name}
                  <span className="track-sub">{f.blurb}</span>
                  <span className="track-fx">{f.gives} · {f.costs[band]}</span>
                </span>
                <Meter level={f.level[band]} hot={isPicked} />
                {isPicked && <span className="taken">taken</span>}
              </button>
            );
          })}
        </div>
        {forced && !picked && (
          <div className="note hot" style={{ marginTop: 12, fontSize: 13 }}>
            ★ Two years in the red. Rent decides this one.
          </div>
        )}
      </div>

      <div className="col-side">
        <div className="splice ink" />
        <div className="spliced-body" style={{ flex: 'none' }}>
          <div className="splice-label">★ Levels — age {t.age}–{t.age + t.span}</div>
          <StatBlock s={s} />
          <Territories s={s} />
        </div>

        {picked && <OpportunityPanel s={s} cabinet={cabinet} onChoice={onChoice} />}
        {!picked && (
          <div style={{ marginTop: 'auto', paddingTop: 22 }}>
            <div className="note onphoto">
              ★ Pick where the years go. The opportunity comes after, and you cannot pick two.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Territories({ s }) {
  const open = Object.keys(TERRITORY_UNLOCK).filter((k) => TERRITORY_UNLOCK[k] <= s.status);
  const nextT = Object.keys(TERRITORY_UNLOCK).filter((k) => TERRITORY_UNLOCK[k] === s.status + 1);
  return (
    <div className="note" style={{ marginTop: 16 }}>
      Territories open: {open.map((k) => TERRITORY_NAME[k]).join(', ')}
      {nextT.length > 0 && ` · next tier opens ${nextT.map((k) => TERRITORY_NAME[k]).join(', ')}`}
      . Credits outside the States are what push Relevance into international range.
    </div>
  );
}

const CLASS_LABEL = { COMMON: 'Opportunity', CONTRACT: 'Contract', RARE: 'Rare', WHALE: 'White whale' };

function OpportunityPanel({ s, cabinet, onChoice }) {
  const card = s.card;

  if (!card) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 22 }}>
        <div className="splice" />
        <div className="spliced-body">
          <div className="splice-label">★ Splice — nothing came</div>
          <p className="body-copy" style={{ marginTop: 0 }}>
            Nobody called. You worked, and the years went by, and that was the whole of it.
          </p>
          <div className="actions">
            <button className="hit" onClick={() => onChoice('none')}>Let the years pass</button>
          </div>
        </div>
      </div>
    );
  }

  const seenBefore = cabinet.whalesSeen.includes(card.id) || cabinet.whalesPassed.includes(card.id);
  const vars = { artist: s.cast ? s.cast.name : 'them' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 22 }}>
      <div className="splice" />
      <div className="spliced-body">
        <div className="splice-label">
          ★ Splice — {CLASS_LABEL[card.cls]}{card.cls === 'WHALE' ? ' ★★★' : ''}
        </div>
        <div className="anton" style={{ fontSize: 'clamp(20px,2vw,30px)', marginBottom: 12 }}>{card.title}</div>
        {card.cls === 'WHALE' && seenBefore && (
          <div style={{ marginBottom: 14 }}>
            <span className="marker" style={{ fontSize: 24, transform: 'rotate(-5deg)' }}>you have been here before</span>
          </div>
        )}
        <p className="body-copy" style={{ marginTop: 0 }}>{card.body(vars)}</p>

        <div className="actions">
          <button className="hit" onClick={() => onChoice('accept')}>{card.accept.label}</button>
          <button className="hit no" onClick={() => onChoice('pass')}>{card.pass.label}</button>
        </div>
        <div className="note" style={{ marginTop: 16 }}>
          <div><strong style={{ color: 'var(--ink)' }}>Take:</strong> <FxSummary fx={card.accept.fx} s={s} /></div>
          <div><strong style={{ color: 'var(--signal)' }}>Pass:</strong> <FxSummary fx={card.pass.fx} s={s} /></div>
        </div>
      </div>
    </div>
  );
}

const FX_NAMES = { skill: 'Skill', taste: 'Taste', relevance: 'Relevance', connections: 'Connections', publishing: 'Publishing' };

function FxSummary({ fx, s }) {
  const f = typeof fx === 'function' ? fx(s) : fx;
  const parts = [];
  for (const k of Object.keys(FX_NAMES)) if (f[k]) parts.push(`${f[k] > 0 ? '+' : '−'}${FX_NAMES[k]}`);
  if (f.cash) parts.push(f.cash > 0 ? `+${money(Math.round(f.cash))}` : `−$${Math.abs(Math.round(f.cash)).toLocaleString()}`);
  if (f.placement) parts.push(f.underground ? 'Underground credit' : `Tier ${f.placement.tier} credit`);
  if (f.royaltyMult !== undefined) parts.push(f.royaltyMult === 0 ? 'No more royalties' : f.royaltyMult > 1 ? 'Better royalties' : 'Worse royalties');
  return <span>{parts.join(' · ') || 'nothing changes'}</span>;
}

/* ---------- resolve ---------- */

function ResolveScreen({ s, onNext }) {
  const r = s.report;
  const demoted = r.statusTo < r.statusFrom;
  const promoted = r.statusTo > r.statusFrom;
  const last = s.turn === TURNS.length - 1;
  const events = r.events.filter((e) => e.kind === 'placement');
  const terr = r.events.filter((e) => e.kind === 'territory');

  return (
    <div className="mainrow">
      <div className="col-wide">
        <div className="splice ink" />
        <div className="spliced-body">
          <div className="splice-label">★ Side B — age {r.age}–{r.age + r.span} · {r.focus}</div>
          <p className="body-copy" style={{ marginTop: 0, marginBottom: 24 }}>{r.diary}</p>

          {(promoted || demoted) && (
            <div style={{ marginBottom: 22 }}>
              <span className={`stamp${promoted ? ' ink' : ''}`}>
                {demoted ? 'Demoted' : 'Promoted'} — {SHORT_STATUS[r.statusFrom]} → {SHORT_STATUS[r.statusTo]}
              </span>
            </div>
          )}

          {(events.length > 0 || terr.length > 0 || r.awardEvents.length > 0 || r.certEvents.length > 0) && (
            <div style={{ marginTop: 'auto' }}>
              {events.map((e, i) => (
                <div className="entry" key={`p${i}`}>
                  <span className="who">{e.placement.artist}</span>
                  <span className="meta">{e.placement.underground ? 'UNDERGROUND' : `TIER ${e.placement.tier}`}{e.placement.score ? ' · SCORE' : ''} CREDIT</span>
                </div>
              ))}
              {terr.map((e, i) => (
                <div className="entry" key={`t${i}`}><span className="who">{e.text}</span><span className="meta">REACH</span></div>
              ))}
              {r.awardEvents.map((e, i) => (
                <div className="entry reveal" key={`a${i}`} style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="who">{e.kind} — {e.category}</span>
                  <span className={`meta${e.won ? ' hot' : ''}`}>{e.won ? 'WON' : 'NOMINATED'}</span>
                </div>
              ))}
              {r.certEvents.map((e, i) => (
                <div className="entry reveal" key={`c${i}`} style={{ animationDelay: `${(i + 1) * 90}ms` }}>
                  <span className="who">{e.artist}</span>
                  <span className={`meta${e.level === 'diamond' ? ' hot' : ''}`}>
                    {{ gold: 'GOLD', platinum: 'PLATINUM', multi: 'MULTI-PLATINUM', diamond: 'DIAMOND' }[e.level]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="col-side">
        <div className="splice" />
        <div className="spliced-body">
          <div className="splice-label">★ Levels — what it cost</div>
          <StatBlock s={s} deltas={r.deltas} />
          <div className="note" style={{ marginTop: 16 }}>
            {[
              r.income > 0 && `Royalties ${money(r.income)}`,
              r.costs > 0 && `Living −$${r.costs.toLocaleString()}`,
              r.decay > 0 && `Relevance decay −${r.decay}`,
            ].filter(Boolean).join(' · ') || 'Nothing came in and nothing went out.'}
          </div>
          <div className="actions">
            <button className="hit wide" onClick={onNext}>
              {last ? 'And then you were fifty' : `Continue to ${TURNS[s.turn + 1].age}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* END                                                                 */
/* ================================================================== */

function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function EndScreen({ s, name, onCabinet, onTitle }) {
  const score = useCountUp(s.score);
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const producer = name || 'Unnamed Producer';

  useEffect(() => { if (canvasRef.current) drawCareerCard(canvasRef.current, s, producer); }, [s, producer]);
  const txt = useMemo(() => shareText(s), [s]);

  const loyal = s.loyalProducerThisRun || [];

  return (
    <div className="stage">
      <div className="panel pad row">
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ marginBottom: 4 }}>The end of the run</div>
          <div className="age-num chrome" style={{ fontSize: 'clamp(38px, 6vw, 86px)' }}>{STATUS[s.status].name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stamp ink" style={{ background: STATUS[s.status].color, color: '#fff', borderColor: STATUS[s.status].color }}>
            {STATUS[s.status].name}
          </div>
          <div className="mono sub sm" style={{ marginTop: 12 }}>
            14 → {s.retiredAge} · {s.voluntary ? 'Retired' : 'Ran out of road'}
          </div>
        </div>
      </div>

      <div className="mainrow">
        <div className="col-wide">
          <div className="splice ink" />
          <div className="spliced-body">
            <div className="splice-label">★ Liner notes</div>
            <p className="body-copy" style={{ marginTop: 0 }}>
              {s.voluntary
                ? `You stopped at ${s.retiredAge}, ${s.retiredAge - 14} years in, holding the rank of ${STATUS[s.status].name.toLowerCase()}.`
                : `You turned fifty still working, holding the rank of ${STATUS[s.status].name.toLowerCase()}. The decision had made itself some years earlier.`}
            </p>
            {isArchitect(s) && (
              <div style={{ marginTop: 18 }}>
                <span className="marker" style={{ fontSize: 28, transform: 'rotate(-4deg)' }}>underground canon</span>
              </div>
            )}
            {loyal.length > 0 && (
              <div className="note" style={{ marginTop: 18 }}>
                ★ Loyal Producer — you kept coming back to {loyal.join(', ')}, more than {s.loyalProducerThreshold} times each.
              </div>
            )}
            <div className="actions">
              <button className="hit" onClick={onTitle}>Run it again</button>
              <button className="hit no" onClick={onCabinet}>Trophy cabinet</button>
            </div>
          </div>
        </div>

        <div className="col-side">
          <div className="splice" />
          <div className="spliced-body">
            <div className="splice-label">★ Final score</div>
            <div className="score-num">{score.toLocaleString()}</div>
            <div className="note" style={{ marginTop: 10 }}>
              Skill {s.skill} · Taste {s.taste} · Relevance {s.relevance} · Connections {s.connections} · {money(s.cash)}
            </div>
            <table className="tab" style={{ marginTop: 18 }}>
              <tbody>
                <tr><td>Grammy</td><td>{s.awards.grammyWins} / {s.awards.grammyNoms}</td></tr>
                <tr><td>Oscar</td><td>{s.awards.oscarWins} / {s.awards.oscarNoms}</td></tr>
                <tr><td>Emmy</td><td>{s.awards.emmyWins} / {s.awards.emmyNoms}</td></tr>
                <tr><td>Plaques</td><td>{s.certs.gold}G {s.certs.platinum}P {s.certs.multi}M {s.certs.diamond}D</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel pad">
        <div className="mono sm" style={{ marginBottom: 14 }}>★ Career card</div>
        <canvas ref={canvasRef} className="cardimg" />
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="hit" onClick={() => downloadCanvas(canvasRef.current, 'basement-career-card.png')}>Save image</button>
          <button className="hit no" onClick={() => navigator.clipboard.writeText(txt).then(() => setCopied(true))}>
            {copied ? 'Copied' : 'Copy result'}
          </button>
        </div>
        <pre className="share" style={{ marginTop: 18 }}>{txt}</pre>
      </div>

      <div className="panel pad">
        <div className="mono sm" style={{ marginBottom: 14 }}>★ The diary, in full</div>
        <ul className="difflist">
          {s.diary.map((d, i) => (
            <li key={i}><span className="age">AGE {d.age}</span> — {d.text}</li>
          ))}
        </ul>
      </div>

      {s.placements.length > 0 && (
        <div className="panel pad">
          <div className="mono sm" style={{ marginBottom: 14 }}>★ Credits</div>
          {s.placements.map((p, i) => (
            <div className="entry" key={i}>
              <span className="who">{p.artist}</span>
              <span className="meta">{p.underground ? 'UNDERGROUND' : `TIER ${p.tier}`}{p.score ? ' · SCORE' : ''} · AGE {p.age}</span>
            </div>
          ))}
        </div>
      )}

      <Bling certs={s.certs} tag={s.snapshot.architect ? 'underground canon' : 'demo tape'} />
    </div>
  );
}


/* ================================================================== */
/* CABINET                                                             */
/* ================================================================== */

function Plaque({ tier, label, count }) {
  const earned = count > 0;
  return (
    <div className={`plaque ${tier}${earned ? '' : ' locked'}`}>
      <div className="plaque-label">{label}</div>
      <div className="plaque-count">{earned ? `×${count}` : '—'}</div>
    </div>
  );
}

function Cabinet({ cabinet, onBack, onWipe }) {
  const c = cabinet;
  const avgAge = c.retirementAges.length
    ? Math.round(c.retirementAges.reduce((a, b) => a + b, 0) / c.retirementAges.length) : 0;
  const highest = c.highestStatus ? STATUS[c.highestStatus] : null;
  const artistsPlaced = c.artistsPlaced || [];
  const loyalProducer = c.loyalProducer || [];
  const chartsLanded = c.chartsLanded || [];

  return (
    <div className="stage">
      <div className="panel pad row">
        <div>
          <div className="mono" style={{ marginBottom: 4 }}>Lifetime</div>
          <div className="age-num chrome" style={{ fontSize: 'clamp(40px, 7vw, 96px)' }}>CABINET</div>
        </div>
        <button className="hit no" onClick={onBack}>Back</button>
      </div>

      <div className="mainrow">
        <div className="col-wide">
          <div className="splice ink" />
          <div className="spliced-body">
            <div className="splice-label">★ The record</div>
            <table className="tab">
              <tbody>
                <tr><td>Runs played</td><td>{c.runs}</td></tr>
                <tr><td>Average retirement age</td><td>{avgAge || '—'}</td></tr>
                <tr><td>Longest career</td><td>{c.longestCareer ? `${c.longestCareer} years` : '—'}</td></tr>
                <tr><td>Highest status ever reached</td><td>{highest ? highest.name : '—'}</td></tr>
                <tr><td>Grammy — won / nominated</td><td>{c.grammyWins} / {c.grammyNoms}</td></tr>
                <tr><td>Oscar — won / nominated</td><td>{c.oscarWins} / {c.oscarNoms}</td></tr>
                <tr><td>Emmy — won / nominated</td><td>{c.emmyWins} / {c.emmyNoms}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-side">
          <div className="splice" />
          <div className="spliced-body">
            <div className="splice-label">★ Plaques</div>
            <table className="tab">
              <tbody>
                <tr><td>Gold</td><td>{c.certs.gold}</td></tr>
                <tr><td>Platinum</td><td>{c.certs.platinum}</td></tr>
                <tr><td>Multi-Platinum</td><td>{c.certs.multi}</td></tr>
                <tr><td>Diamond</td><td>{c.certs.diamond}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <CertBadge certs={c.certs} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel pad">
        <div className="row" style={{ alignItems: 'baseline', marginBottom: 16 }}>
          <div className="mono sm">★ Certified plaques</div>
        </div>
        <div className="plaquerow">
          <Plaque tier="gold" label="Gold" count={c.certs.gold} />
          <Plaque tier="platinum" label="Platinum" count={c.certs.platinum} />
          <Plaque tier="multi" label="Multi-Platinum" count={c.certs.multi} />
          <Plaque tier="diamond" label="Diamond" count={c.certs.diamond} />
        </div>
      </div>

      <div className="panel pad">
        <div className="row" style={{ alignItems: 'baseline', marginBottom: 16 }}>
          <div className="mono sm">★ Artist Album</div>
          <div className="mono sm">{artistsPlaced.length} / {ROSTER_TOTAL}</div>
        </div>
        <div className="dexgrid">
          {ROSTER_ARTISTS.map((a, i) => {
            const unlocked = artistsPlaced.includes(a.name);
            return (
              <div className={`dexcell${unlocked ? ' unlocked' : ' locked'}`} key={`${a.name}-${i}`}>
                <div className="dexnum">#{String(i + 1).padStart(3, '0')}</div>
                {unlocked ? (
                  <>
                    <div className="dexname">{a.name}</div>
                    <div className="dexmeta">{a.genre} · {a.region}</div>
                  </>
                ) : (
                  <div className="dexblack">?????</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel pad">
        <div className="row" style={{ alignItems: 'baseline', marginBottom: 16 }}>
          <div className="mono sm">★ Billboard #1 Producer</div>
          <div className="mono sm">{chartsLanded.length} / {BILLBOARD_CHARTS.length}</div>
        </div>
        <div className="dexgrid">
          {BILLBOARD_CHARTS.map((g, i) => {
            const unlocked = chartsLanded.includes(g);
            return (
              <div className={`dexcell${unlocked ? ' unlocked' : ' locked'}`} key={g}>
                <div className="dexnum">#{String(i + 1).padStart(3, '0')}</div>
                {unlocked ? (
                  <div className="dexname">{g.toUpperCase()}</div>
                ) : (
                  <div className="dexblack">?????</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel pad">
        <div className="row" style={{ alignItems: 'baseline', marginBottom: 16 }}>
          <div className="mono sm">★ Loyal Producer</div>
          <div className="mono sm">{loyalProducer.length}</div>
        </div>
        {loyalProducer.length === 0 ? (
          <div className="note">Land more placements with the same artist in a single run to earn this one. The threshold is different every run.</div>
        ) : (
          <div className="slots">
            {loyalProducer.map((n) => (
              <div className="slot" key={n}>
                <div className="sname">{n}</div>
                <div className="ssub hot">★ Loyal Producer</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Bling certs={c.certs} tag="the cabinet">
        <button className="tick quiet" onClick={() => { if (confirm('Erase the entire cabinet? This cannot be undone.')) onWipe(); }}>
          Erase cabinet
        </button>
      </Bling>
    </div>
  );
}
