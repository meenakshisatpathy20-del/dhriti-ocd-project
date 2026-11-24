/**
 * Microphone signal analysis with the Web Audio API.
 *
 * Used for:
 *  - exhale detection in panic mode (calibrated loudness above room noise)
 *  - hum detection in Bhramari breathing (sustained voiced pitch 80-400 Hz)
 *  - simple voice arousal features (loudness and pitch variability)
 *
 * Speech recognition is paused while the meter runs, because some Android
 * browsers allow only one consumer of the microphone at a time.
 */

export interface MicFrame {
  rms: number;
  /** Fundamental frequency in Hz when the sound is voiced, else null. */
  pitch: number | null;
  t: number;
}

export class MicMeter {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private buf = new Float32Array(2048);
  private handler: (f: MicFrame) => void = () => undefined;
  baseline = 0.01;

  /** Swap the per-frame handler without reopening the microphone. */
  setHandler(fn: (f: MicFrame) => void): void {
    this.handler = fn;
  }

  get running(): boolean {
    return this.ctx !== null;
  }

  async start(onFrame?: (f: MicFrame) => void): Promise<void> {
    if (onFrame) this.handler = onFrame;
    if (this.ctx) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
    const loop = () => {
      if (!this.analyser || !this.ctx) return;
      this.analyser.getFloatTimeDomainData(this.buf);
      this.handler({ rms: rms(this.buf), pitch: autoCorrelatePitch(this.buf, this.ctx.sampleRate), t: performance.now() });
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  /** Measure room noise for `ms` milliseconds and store it as the baseline. */
  async calibrate(ms = 3000): Promise<number> {
    const samples: number[] = [];
    const end = performance.now() + ms;
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (!this.analyser) return resolve();
        this.analyser.getFloatTimeDomainData(this.buf);
        samples.push(rms(this.buf));
        if (performance.now() < end) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
    samples.sort((a, b) => a - b);
    this.baseline = Math.max(0.003, samples[Math.floor(samples.length * 0.6)] ?? 0.01);
    return this.baseline;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
  }
}

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/** Autocorrelation pitch detector, limited to the human voice range. */
export function autoCorrelatePitch(buf: Float32Array, sampleRate: number): number | null {
  const level = rms(buf);
  if (level < 0.01) return null;
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.floor(sampleRate / 80);
  let bestLag = -1;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < buf.length - lag; i++) c += buf[i] * buf[i + lag];
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  let energy = 0;
  for (let i = 0; i < buf.length; i++) energy += buf[i] * buf[i];
  const clarity = best / (energy || 1);
  return bestLag > 0 && clarity > 0.5 ? sampleRate / bestLag : null;
}

/**
 * Tracks sustained events (an exhale or a hum) from a frame stream.
 * An event starts when `active` is true and ends after `gapMs` of inactivity;
 * events shorter than `minMs` are ignored.
 */
export class SustainTracker {
  private startAt: number | null = null;
  private lastActive = 0;
  constructor(private minMs: number, private gapMs = 250) {}

  update(active: boolean, t: number): number | null {
    if (active) {
      if (this.startAt === null) this.startAt = t;
      this.lastActive = t;
      return null;
    }
    if (this.startAt !== null && t - this.lastActive > this.gapMs) {
      const dur = this.lastActive - this.startAt;
      this.startAt = null;
      return dur >= this.minMs ? dur : null;
    }
    return null;
  }

  current(t: number): number {
    return this.startAt === null ? 0 : t - this.startAt;
  }
}
