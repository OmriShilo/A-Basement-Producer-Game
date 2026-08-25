import { useEffect, useRef, useState, useCallback } from 'react';
import { createRackSession, INSTRUMENTS } from '../rack/session.js';
import { buildYamada } from '../rack/yamada3d.js';
import { buildSynth5 } from '../rack/synth3d.js';
import { buildRhodes } from '../rack/rhodes3d.js';
import { buildSuper } from '../rack/super3d.js';
import { buildNord } from '../rack/nord3d.js';
import { HOT_HANDS_AT } from '../engine/rack.js';

const BUILDERS = {
  yamada: buildYamada,
  synth5: buildSynth5,
  rhodes: buildRhodes,
  super: buildSuper,
  nord: buildNord,
};

/**
 * THE RACK — the year you play instead of read.
 *
 * Two things here are load-bearing and easy to undo by accident:
 *
 * Instruments are built on first selection, not up front. The standalone build
 * created all five at boot, which is fine for a page that only ever opens once;
 * inside a career you might visit the rack ten times, and five WebGL contexts
 * per visit runs into the browser's cap. Lazily built and fully disposed on
 * exit, a visit costs only the instruments you actually looked at.
 *
 * The screen never shows what the year is worth. The whole game hides the
 * number a choice pays, and the rack is the one place a player could otherwise
 * reverse-engineer it by watching a counter tick — so it reports what you did
 * (notes, chords) and never what it converts to.
 */
export default function Rack({ year, age, onDone }) {
  const hosts = useRef({});
  const built = useRef({});
  const session = useRef(null);
  const [stats, setStats] = useState({
    current: 'yamada', notesPlayed: 0, chordsFound: 0, lastChord: null, instrumentsPlayed: 1,
  });
  const [toast, setToast] = useState(null);
  const lastChord = useRef(null);

  useEffect(() => {
    session.current = createRackSession(setStats);
    return () => {
      Object.values(built.current).forEach((stage) => stage.dispose());
      built.current = {};
      session.current.dispose();
    };
  }, []);

  // Build whichever instrument is showing, once.
  useEffect(() => {
    const id = stats.current;
    if (built.current[id] || !hosts.current[id]) return;
    built.current[id] = BUILDERS[id](hosts.current[id]);
  }, [stats.current]);

  // The chord toast is a reaction to a new chord, not a render of the count.
  useEffect(() => {
    if (!stats.lastChord || stats.lastChord === lastChord.current) return;
    lastChord.current = stats.lastChord;
    setToast(stats.lastChord);
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [stats.lastChord, stats.chordsFound]);

  const select = useCallback((id) => session.current.select(id), []);
  const leave = useCallback(() => onDone(session.current.result()), [onDone]);

  return (
    <div className="rack-screen">
      <header className="rack-head">
        <div>
          <p className="rack-eyebrow">{year} · age {age}</p>
          <h1 className="rack-title">The Rack</h1>
        </div>
        <dl className="rack-stats">
          <div><dt>Notes played</dt><dd>{stats.notesPlayed.toLocaleString()}</dd></div>
          <div><dt>Chords found</dt><dd>{stats.chordsFound.toLocaleString()}</dd></div>
          <div><dt>Last chord</dt>
            <dd className={stats.lastChord ? 'rack-chord is-set' : 'rack-chord'}>
              {stats.lastChord || '—'}
            </dd>
          </div>
        </dl>
      </header>

      <main className="rack-body">
        <div className="rack-stage">
          {INSTRUMENTS.map((inst) => (
            <div
              key={inst.id}
              ref={(el) => { hosts.current[inst.id] = el; }}
              className={inst.id === stats.current ? 'rack-inst is-active' : 'rack-inst'}
            />
          ))}
        </div>

        <aside className="rack-rail">
          <section className="rack-np">
            <h2 className="rack-label">Now playing</h2>
            <p className="rack-np-name">{INSTRUMENTS.find((i) => i.id === stats.current).name}</p>
            <p className="rack-np-family">{INSTRUMENTS.find((i) => i.id === stats.current).family}</p>
          </section>

          <section>
            <h2 className="rack-label">The rack — choose one</h2>
            <div className="rack-list">
              {INSTRUMENTS.map((inst, i) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => select(inst.id)}
                  aria-pressed={inst.id === stats.current}
                  className={inst.id === stats.current ? 'rack-item is-active' : 'rack-item'}
                >
                  <span className="rack-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rack-text">
                    <span className="rack-name">{inst.name}</span>
                    <span className="rack-family">{inst.family}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rack-out">
            <p className="rack-hint">
              {stats.chordsFound >= HOT_HANDS_AT
                ? 'You have something. Take it out of the room.'
                : 'Find chords. They are what the year is judged on.'}
            </p>
            <button type="button" className="rack-leave" onClick={leave}>
              End the year
            </button>
          </section>
        </aside>
      </main>

      <div className={toast ? 'rack-toast is-shown' : 'rack-toast'} role="status" aria-live="polite">
        {toast}<span className="rack-toast-sub">chord recognised</span>
      </div>
    </div>
  );
}
