/* ============================================================
   THE RACK — audio engines, chord naming, session scoring.

   Ported from the standalone build. The engines are unchanged; what
   was stripped is the DOM layer — the original read its counters
   straight out of `document` and drew its own instrument list. Here
   React owns the chrome, so this file exposes a headless session and
   notifies a subscriber when anything it tracks changes.

   The 3D modules still resolve the trigger off `window.hit`, which is
   their published host contract. `createRackSession` installs it on
   mount and takes it back on dispose, so nothing survives the visit.
   ============================================================ */

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pc = (m) => ((m % 12) + 12) % 12;

/* ============================================================
   Audio engine
   ============================================================ */
let actx = null, master = null;
function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = 0.8;
    // catches chords/overlapping notes before they clip -- a 3-note chord on
    // the piano alone peaks well over 1.0 pre-limiter (measured ~2.1)
    const limiter = actx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    master.connect(limiter).connect(actx.destination);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

/** The rack is one screen inside a longer game — the context is shared across
 *  visits (browsers cap how many a page may open), but it must not keep
 *  running while you are back on the career screen. */
export function suspendAudio() {
  if (actx && actx.state === 'running') actx.suspend();
}

/* Grand piano: additive partials with a hammer attack and long ring */
function playPiano(freq) {
  const ctx = audio(), t = ctx.currentTime;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.5, t + 0.005);   // hammer strike
  amp.gain.exponentialRampToValueAtTime(0.16, t + 0.5);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);  // long ring
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(6500, t);
  lp.frequency.exponentialRampToValueAtTime(1400, t + 2.5);
  const amps = [1, 0.55, 0.38, 0.22, 0.12, 0.06];
  amps.forEach((a, i) => {
    const p = i + 1;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * p * (1 + 0.0007 * p * p); // slight inharmonicity
    const g = ctx.createGain(); g.gain.value = a;
    o.connect(g).connect(amp);
    o.start(t); o.stop(t + 3.1);
  });
  amp.connect(lp).connect(master);
}

/* Synth-5: two detuned saws -> resonant lowpass with envelope sweep */
function playSynth5(freq) {
  const ctx = audio(), t = ctx.currentTime;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = o2.type = 'sawtooth';
  o1.frequency.value = freq; o2.frequency.value = freq; o2.detune.value = 8;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.Q.value = 7;
  filt.frequency.setValueAtTime(freq * 6 + 1200, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 2.2), t + 0.7);
  // amp: attack -> decay -> sustain, HELD until release()
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);   // attack
  g.gain.exponentialRampToValueAtTime(0.26, t + 0.25);   // decay to sustain
  o1.connect(filt); o2.connect(filt); filt.connect(g).connect(master);
  o1.start(t); o2.start(t);

  let done = false;
  const release = () => {
    if (done) return; done = true;
    clearTimeout(safety);
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(0.0001, now, 0.09);             // 90ms release tail
    o1.stop(now + 0.5); o2.stop(now + 0.5);
  };
  const safety = setTimeout(release, 15000);               // never leak a stuck note
  return { release };
}

/* Rhodes: FM (sine carrier + sine modulator) bell tine */
function playRhodes(freq) {
  const ctx = audio(), t = ctx.currentTime;
  const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = freq;
  const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * 2;
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(freq * 3.5, t);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.2, t + 0.4);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  mod.connect(modGain).connect(carrier.frequency);
  carrier.connect(amp).connect(master);
  mod.start(t); carrier.start(t); mod.stop(t + 2.3); carrier.stop(t + 2.3);
}

/* Super Synth: all-digital grainy synth bass — waveshaped + bitcrush-
   stepped for grit, heavy FM edge, sub-octave for bass weight. */
let _grainCurve = null;
function grainCurve() {
  if (_grainCurve) return _grainCurve;
  const n = 2048, curve = new Float32Array(n), levels = 22, drive = 3.2;
  for (let i = 0; i < n; i++) {
    let x = (i / (n - 1)) * 2 - 1;
    let y = Math.tanh(x * drive);            // distortion
    y = Math.round(y * levels) / levels;     // bitcrush steps -> grain
    curve[i] = y * 0.9;
  }
  _grainCurve = curve; return curve;
}
function playSuper(freq) {
  const ctx = audio(), t = ctx.currentTime;
  freq = freq / 4;                         // 2 octaves down (bass register)
  const oscs = [];
  const pre = ctx.createGain(); pre.gain.value = 0.16;
  // gritty Reese: detuned saw stack (the beating between them = the classic Reese)
  [-16, -8, 0, 8, 16].forEach((d) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.value = freq; o.detune.value = d;
    o.connect(pre); oscs.push(o);
  });
  // super-synth square layer + sub for weight
  const sq = ctx.createOscillator(); sq.type = 'square'; sq.frequency.value = freq; sq.detune.value = 4;
  const sqG = ctx.createGain(); sqG.gain.value = 0.5; sq.connect(sqG).connect(pre); oscs.push(sq);
  const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = freq / 2;
  const subG = ctx.createGain(); subG.gain.value = 0.6; sub.connect(subG).connect(pre); oscs.push(sub);
  // digital FM edge on the square layer
  const fm = ctx.createOscillator(); fm.type = 'square'; fm.frequency.value = freq * 1.5;
  const fmG = ctx.createGain(); fmG.gain.value = freq * 0.4;
  fm.connect(fmG); fmG.connect(sq.frequency); oscs.push(fm);
  // grain: waveshape + bitcrush steps
  const shaper = ctx.createWaveShaper();
  shaper.curve = grainCurve(); shaper.oversample = 'none';
  // moving resonant lowpass = Reese motion
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 9;
  filt.frequency.value = Math.min(6000, freq * 10 + 500);
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 1.1;
  const lfoG = ctx.createGain(); lfoG.gain.value = freq * 5;
  lfo.connect(lfoG); lfoG.connect(filt.frequency); oscs.push(lfo);
  // amp: attack -> sustain, HELD until release()
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.55, t + 0.01);   // punchy attack
  amp.gain.exponentialRampToValueAtTime(0.4, t + 0.25);    // settle into sustain
  pre.connect(shaper).connect(filt).connect(amp).connect(master);
  oscs.forEach((o) => o.start(t));

  let done = false;
  const release = () => {
    if (done) return; done = true;
    clearTimeout(safety);
    const now = ctx.currentTime;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setTargetAtTime(0.0001, now, 0.08);           // 80ms release tail
    oscs.forEach((o) => { try { o.stop(now + 0.5); } catch (e) {} });
  };
  const safety = setTimeout(release, 15000);               // never leak a stuck note
  return { release };
}

/* MORD 4: sustaining tonewheel organ — drawbar partials, a Hammond-style
   key click, gentle vibrato; held until release(). */
function playNord(freq) {
  const ctx = audio(), t = ctx.currentTime;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.34, t + 0.012);   // fast organ attack
  amp.gain.exponentialRampToValueAtTime(0.28, t + 0.12);    // settle into sustain
  // drawbar partials: 16' 8' 5⅓' 4' 2⅔' 2'
  const bars = [[0.5, 0.5], [1, 1.0], [1.5, 0.7], [2, 0.55], [3, 0.32], [4, 0.22]];
  const tone = [];
  bars.forEach(([r, g]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * r;
    const og = ctx.createGain(); og.gain.value = g;
    o.connect(og).connect(amp); tone.push(o);
  });
  // gentle vibrato on the tonewheels (cents)
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 5.4;
  const lfoG = ctx.createGain(); lfoG.gain.value = 6;
  lfo.connect(lfoG); tone.forEach((o) => lfoG.connect(o.detune));
  // Hammond-ish key click / percussion tick
  const clickG = ctx.createGain();
  clickG.gain.setValueAtTime(0.4, t); clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  const click = ctx.createOscillator(); click.type = 'triangle'; click.frequency.value = freq * 4;
  click.connect(clickG).connect(amp);
  amp.connect(master);
  const oscs = [...tone, lfo, click];
  oscs.forEach((o) => o.start(t));

  let done = false;
  const release = () => {
    if (done) return; done = true;
    clearTimeout(safety);
    const now = ctx.currentTime;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setTargetAtTime(0.0001, now, 0.05);            // ~50ms organ release
    oscs.forEach((o) => { try { o.stop(now + 0.3); } catch (e) {} });
  };
  const safety = setTimeout(release, 15000);
  return { release };
}

const ENGINES = { yamada: playPiano, synth5: playSynth5, rhodes: playRhodes, super: playSuper, nord: playNord };

/** The rack's five units, in rack order. */
export const INSTRUMENTS = [
  { id: 'yamada', name: 'Yamada', family: 'digital piano' },
  { id: 'synth5', name: 'Synth-5', family: 'analog polysynth' },
  { id: 'rhodes', name: 'Roads-H', family: 'electric piano' },
  { id: 'super', name: 'Super Synth', family: 'grain bass' },
  { id: 'nord', name: 'MORD 4', family: 'stage organ' },
];

/* ============================================================
   Chord naming (last 3 distinct pitch classes)
   ============================================================ */
const CHORD_TEMPLATES = {
  major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6],
  augmented: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7],
};
const arrEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
function detectChord(midiNotes) {
  const pcs = [...new Set(midiNotes.map(pc))];
  if (pcs.length !== 3) return null;
  for (const root of pcs) {
    const ivs = pcs.map((p) => pc(p - root)).sort((a, b) => a - b);
    for (const [name, tmpl] of Object.entries(CHORD_TEMPLATES)) {
      if (arrEq(ivs, tmpl)) return { name, root: NAMES[root] };
    }
  }
  return null;
}

// A trained pianist's fastest sustained trill tops out near 10-12 notes/sec,
// i.e. ~80-100ms between attacks. keys3d.js gates pointer-driven hits at this
// same interval; repeating it here keeps any other call path (a future
// sequencer, the console) from machine-gunning the engines into mush.
const MIN_HIT_GAP_MS = 90;

/**
 * Opens a rack session. `onChange(state)` fires whenever the visible
 * numbers move. Returns the controller the React screen drives.
 */
export function createRackSession(onChange) {
  let current = 'yamada';
  let notesPlayed = 0;
  let lastChord = null;
  let recent = [];
  let lastHitTime = -Infinity;
  const chords = new Set();     // distinct chords, so one shape replayed is not a score
  const touched = new Set(['yamada']);

  const snapshot = () => ({
    current,
    notesPlayed,
    chordsFound: chords.size,
    lastChord,
    instrumentsPlayed: touched.size,
  });
  const emit = () => onChange(snapshot());

  function registerNote(midi) {
    recent.push(midi);
    if (recent.length > 3) recent.shift();
    if (recent.length < 3) return;
    const chord = detectChord(recent);
    if (!chord) return;
    lastChord = `${chord.root} ${chord.name}`;
    chords.add(lastChord);
    recent = [];
  }

  function hit(midi, node, evt) {
    const now = performance.now();
    if (now - lastHitTime < MIN_HIT_GAP_MS) return undefined;
    lastHitTime = now;

    // engines may return a voice handle ({ release }) for sustained notes,
    // or undefined for one-shot voices
    const voice = ENGINES[current](midiToFreq(midi));
    notesPlayed++;
    registerNote(midi);
    emit();
    return voice;
  }

  const prevHit = window.hit;
  window.hit = hit;

  return {
    state: snapshot,
    select(id) {
      if (!ENGINES[id] || id === current) return;
      current = id;
      recent = [];
      touched.add(id);
      audio();
      emit();
    },
    /** What the career screen scores the visit on. */
    result: () => ({
      notesPlayed,
      chordsFound: chords.size,
      instrumentsPlayed: touched.size,
    }),
    dispose() {
      window.hit = prevHit;
      suspendAudio();
    },
  };
}
