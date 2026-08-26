import { useEffect, useRef, useState } from 'react';

/**
 * THE ROLL — what a yellow card does after you commit to it.
 *
 * The log used to explain a gamble after the fact, in a sentence, in a column.
 * That is the wrong moment and the wrong medium: the interesting part of a bet
 * is watching it land, not reading about it a year later.
 *
 * The track is the odds, drawn to scale. A 35% card shows a small green zone
 * and a large red one, so the thing you are risking is visible rather than
 * stated. The marker sweeps, decelerates, and stops somewhere inside whichever
 * zone actually won — the result is already decided by the engine before this
 * component mounts, and the animation is only ever a reveal of it. It never
 * decides anything, which matters: the run stays deterministic and the marker
 * cannot contradict the log.
 */
/**
 * Where the marker stops, as a percentage across the track.
 *
 * Exported so it can be tested directly: the one property that must always
 * hold is that the marker lands inside the zone matching the result the engine
 * already decided. A marker that stops in the red on a win would read as the
 * game lying to you. Kept away from the boundary by an inset so it never
 * appears to halt exactly on the line it was meant to fall one side of.
 */
export function landingPercent(chance, won, r) {
  const lo = won ? 0 : chance;
  const hi = won ? chance : 1;
  const span = hi - lo;
  const inset = span * 0.18;
  return (lo + inset + r * Math.max(0.0001, span - inset * 2)) * 100;
}

export default function GambleRoll({ chance, won, swing, onDone }) {
  const pct = Math.round(chance * 100);
  const [pos, setPos] = useState(null);   // null until the sweep starts
  const [shown, setShown] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    timers.current.push(setTimeout(() => setPos(landingPercent(chance, won, Math.random())), 60));
    timers.current.push(setTimeout(() => setShown(true), 1750));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [chance, won]);

  const swingText = swing > 0 ? `+${swing}` : `${swing}`;

  return (
    <div className="roll-screen">
      <div className="roll-card">
        <div className="lbl wide roll-eyebrow">The odds</div>

        <div className="roll-track">
          <div className="roll-zone win" style={{ width: `${pct}%` }}>
            <span>{pct}%</span>
          </div>
          <div className="roll-zone lose" style={{ width: `${100 - pct}%` }}>
            <span>{100 - pct}%</span>
          </div>
          <i
            className={`roll-marker${pos === null ? ' idle' : ''}`}
            style={pos === null ? undefined : { left: `${pos}%` }}
          />
        </div>

        <div className={`roll-result${shown ? ' is-shown' : ''}`}>
          {shown && (
            <>
              <div className={`roll-verdict ${won ? 'won' : 'lost'}`}>
                {won ? 'It landed' : 'It missed'}
              </div>
              <div className="roll-swing">
                {swingText} form
              </div>
              <div className="roll-note">
                {won
                  ? 'Form is temporary. Land something real this year and it becomes permanent.'
                  : 'Form only. Nothing permanent came off your overall.'}
              </div>
              <button className="btn solid roll-go" onClick={onDone} autoFocus>
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
