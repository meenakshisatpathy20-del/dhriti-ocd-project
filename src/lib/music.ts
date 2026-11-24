/**
 * Generative ambient music with the Web Audio API: no audio files, no
 * licensing issues, works offline. Each "mood" is a chord of slowly breathing
 * sine/triangle voices; the app assigns a mood to each situation.
 */

export type Mood = 'calm' | 'focus' | 'sleep' | 'om';

const MOODS: Record<Mood, { label: string; freqs: number[]; type: OscillatorType; lfo: number; use: string }> = {
  calm: { label: 'Calm night sky', freqs: [130.81, 196.0, 246.94, 329.63], type: 'sine', lfo: 0.08, use: 'After a panic attack or a hard urge' },
  focus: { label: 'Steady orbit', freqs: [146.83, 220.0, 293.66], type: 'triangle', lfo: 0.15, use: 'During ERP waiting and exposure practice' },
  sleep: { label: 'Deep space', freqs: [98.0, 146.83, 196.0], type: 'sine', lfo: 0.05, use: 'Wind-down before sleep' },
  om: { label: 'Om drone', freqs: [136.1, 204.15, 272.2], type: 'sine', lfo: 0.1, use: 'Bhramari and meditation' },
};

export const MOOD_LIST = (Object.keys(MOODS) as Mood[]).map((id) => ({ id, ...MOODS[id] }));

/** Which music Dhriti suggests for each situation. */
export function moodFor(situation: 'panic' | 'erp' | 'meditation' | 'night' | 'default'): Mood {
  return { panic: 'calm', erp: 'focus', meditation: 'om', night: 'sleep', default: 'calm' }[situation] as Mood;
}

let ctx: AudioContext | null = null;
let nodes: { osc: OscillatorNode[]; master: GainNode } | null = null;
let current: Mood | null = null;

export function playMood(mood: Mood, volume = 0.12): void {
  stopMusic();
  ctx = ctx ?? new AudioContext();
  const m = MOODS[mood];
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(master);
  master.connect(ctx.destination);
  const osc: OscillatorNode[] = [];
  m.freqs.forEach((f, i) => {
    const o = ctx!.createOscillator();
    o.type = m.type;
    o.frequency.value = f;
    o.detune.value = (i - 1) * 4;
    const g = ctx!.createGain();
    g.gain.value = 0.25 / m.freqs.length;
    const lfo = ctx!.createOscillator();
    lfo.frequency.value = m.lfo * (1 + i * 0.3);
    const lfoGain = ctx!.createGain();
    lfoGain.gain.value = 0.12 / m.freqs.length;
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(g).connect(filter);
    o.start();
    lfo.start();
    osc.push(o, lfo);
  });
  nodes = { osc, master };
  current = mood;
}

export function stopMusic(): void {
  if (!ctx || !nodes) return;
  const { osc, master } = nodes;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + 1.2);
  osc.forEach((o) => o.stop(t + 1.3));
  nodes = null;
  current = null;
}

export const playingMood = () => current;
