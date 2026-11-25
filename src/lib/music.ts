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
  master.gain.linearRampToValueAtTime(Math.min(1, volume), now + 2.5);
  const comp = c.createDynamicsCompressor();
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
      const base = (k === 0 ? 0.32 : 0.1) / m.pad.length;
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
    g.gain.linearRampToValueAtTime(0.22, t + 0.03);
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
