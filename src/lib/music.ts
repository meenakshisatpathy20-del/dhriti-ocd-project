/**
 * Generative ambient music with the Web Audio API: no audio files, no
 * licensing issues, works offline. Each "mood" is a soft pad (a chord of
 * gently breathing voices) plus slow, random pentatonic chimes, so it sounds
 * like music rather than a hum. Notes sit in the range small phone speakers
 * can actually play (roughly 260-1300 Hz).
 *
 * Browsers start audio "suspended" unless it begins inside a tap, so the
 * context is resumed on every play and unlocked on the first tap anywhere.
 */

export type Mood = 'calm' | 'focus' | 'sleep' | 'om';

interface MoodDef { label: string; pad: number[]; chimes: number[]; chimeEvery: number; type: OscillatorType; lfo: number; use: string }

const MOODS: Record<Mood, MoodDef> = {
  calm: { label: 'Calm night sky', pad: [261.63, 329.63, 392.0, 523.25], chimes: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5], chimeEvery: 2.6, type: 'sine', lfo: 0.08, use: 'After a panic attack or a hard urge' },
  focus: { label: 'Steady orbit', pad: [293.66, 440.0, 587.33], chimes: [587.33, 659.25, 739.99, 880.0, 987.77], chimeEvery: 3.2, type: 'triangle', lfo: 0.15, use: 'During ERP waiting and exposure practice' },
  sleep: { label: 'Deep space', pad: [220.0, 329.63, 440.0], chimes: [440.0, 493.88, 554.37, 659.25, 739.99], chimeEvery: 4.5, type: 'sine', lfo: 0.05, use: 'Wind-down before sleep' },
  om: { label: 'Om drone', pad: [272.2, 408.3, 544.4], chimes: [544.4, 612.45, 680.5, 816.6], chimeEvery: 5, type: 'sine', lfo: 0.1, use: 'Bhramari and meditation' },
};

export const MOOD_LIST = (Object.keys(MOODS) as Mood[]).map((id) => ({ id, ...MOODS[id] }));

/** Which music Dhriti suggests for each situation. */
export function moodFor(situation: 'panic' | 'erp' | 'meditation' | 'night' | 'default'): Mood {
  return { panic: 'calm', erp: 'focus', meditation: 'om', night: 'sleep', default: 'calm' }[situation] as Mood;
}

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;
let nodes: { stops: (() => void)[]; master: GainNode; timer: number } | null = null;
let current: Mood | null = null;
const listeners = new Set<(m: Mood | null) => void>();

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = ctx ?? new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

/** Call once at start-up: the first tap anywhere unlocks audio for later, delayed playback. */
export function unlockAudioOnFirstTap(): void {
  const unlock = () => {
    const c = audio();
    if (c) {
      // A silent blip fully unlocks audio on iOS.
      const o = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.05);
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/** Play a mood. `volume` is 0-1 (0.3 is comfortable on a phone speaker). */
export function playMood(mood: Mood, volume = 0.3): void {
  stopMusic();
  const c = audio();
  if (!c) return;
  const m = MOODS[mood];
  const now = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0, now);
  // Phone speakers are small: scale the requested volume up, then let a gentle
  // limiter (not the default squashing compressor) catch the peaks.
  master.gain.linearRampToValueAtTime(Math.min(0.95, volume * 2.2), now + 2.5);
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.01;
  comp.release.value = 0.4;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  filter.connect(comp).connect(master).connect(c.destination);
  const stops: (() => void)[] = [];

  // Pad: each note plus a softer octave above, slowly breathing in volume.
  m.pad.forEach((f, i) => {
    [1, 2].forEach((mult, k) => {
      const o = c.createOscillator();
      o.type = k === 0 ? m.type : 'sine';
      o.frequency.value = f * mult;
      o.detune.value = (i - 1) * 5;
      const g = c.createGain();
      const base = (k === 0 ? 0.55 : 0.16) / m.pad.length;
      g.gain.value = base;
      const lfo = c.createOscillator();
      lfo.frequency.value = m.lfo * (1 + i * 0.35);
      const lg = c.createGain();
      lg.gain.value = base * 0.6;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(filter);
      o.start(now);
      lfo.start(now);
      stops.push(() => { o.stop(); lfo.stop(); });
    });
  });

  // Chimes: soft bell-like notes from a pentatonic scale at gentle, slightly random intervals.
  const chime = () => {
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    const f = m.chimes[Math.floor(Math.random() * m.chimes.length)];
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(filter);
    o.start(t);
    o2.start(t);
    o.stop(t + 3.4);
    o2.stop(t + 3.4);
  };
  chime();
  const timer = window.setInterval(() => { if (Math.random() < 0.8) chime(); }, m.chimeEvery * 1000);

  nodes = { stops, master, timer };
  current = mood;
  listeners.forEach((fn) => fn(current));
}

export function stopMusic(): void {
  if (!ctx || !nodes) return;
  const { stops, master, timer } = nodes;
  window.clearInterval(timer);
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + 1);
  setTimeout(() => stops.forEach((s) => { try { s(); } catch { /* already stopped */ } }), 1100);
  nodes = null;
  current = null;
  listeners.forEach((fn) => fn(null));
}

export const playingMood = () => current;
export const audioState = () => ctx?.state ?? 'none';

/** Subscribe to play/stop changes (for UI indicators). */
export function onMusicChange(fn: (m: Mood | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- Scene ambience for 360° exposure practice ----------

export type Ambience = 'washroom' | 'kitchen' | 'hall' | 'room' | 'temple';

let noiseBuf: AudioBuffer | null = null;
function brownNoise(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = c.sampleRate * 4;
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  noiseBuf = b;
  return b;
}

/**
 * Quiet, realistic background sound for an exposure scene (a dripping tap in a
 * station washroom, a ticking clock at home, a temple bell...). Realism makes
 * exposure work better than music, which can become a distraction or a ritual.
 */
export function playAmbience(kind: Ambience, volume = 0.35): void {
  stopMusic();
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(Math.min(0.95, volume * 2), now + 2);
  master.connect(c.destination);

  const src = c.createBufferSource();
  src.buffer = brownNoise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = { washroom: 900, kitchen: 1400, hall: 500, room: 400, temple: 600 }[kind];
  const ng = c.createGain();
  ng.gain.value = { washroom: 0.35, kitchen: 0.25, hall: 0.3, room: 0.2, temple: 0.18 }[kind];
  src.connect(f).connect(ng).connect(master);
  src.start(now);
  const stops: (() => void)[] = [() => src.stop()];

  const blip = (freq: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine') => {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const bell = () => [1, 2.76, 5.4].forEach((m, i) => blip(620 * m, 620 * m * 0.995, 4 - i, 0.12 / (i + 1)));

  const events: Record<Ambience, { every: number; fn: () => void }> = {
    washroom: { every: 1.7, fn: () => blip(1400 + Math.random() * 300, 500, 0.12, 0.35) },
    kitchen: { every: 1, fn: () => blip(1800, 1700, 0.03, 0.18, 'square') },
    hall: { every: 1, fn: () => blip(2200, 2100, 0.02, 0.15, 'square') },
    room: { every: 1, fn: () => blip(2000, 1900, 0.02, 0.12, 'square') },
    temple: { every: 9, fn: bell },
  };
  const ev = events[kind];
  ev.fn();
  const timer = window.setInterval(() => { if (kind !== 'washroom' || Math.random() < 0.7) ev.fn(); }, ev.every * 1000);
  nodes = { stops, master, timer };
  current = null;
  listeners.forEach((fn) => fn(null));
}
