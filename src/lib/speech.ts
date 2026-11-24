/**
 * Browser speech: recognition (Web Speech API) and synthesis.
 * Everything degrades gracefully: if recognition is missing (e.g. Firefox),
 * the app switches to text input, which also works with Wispr Flow dictation.
 */
import type { AppLang } from '../../shared/i18n/phrases';
import { speechCode } from '../../shared/i18n/phrases';

/* eslint-disable @typescript-eslint/no-explicit-any */
const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export const recognitionSupported = (): boolean => !!SR;
export const synthesisSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

export interface RecognitionResult {
  text: string;
  /** Confidence when the browser reports it (Chrome on Android often reports 0). */
  confidence: number | null;
  final: boolean;
}

export interface RecognizerOptions {
  lang: AppLang;
  continuous?: boolean;
  onResult: (r: RecognitionResult) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class Recognizer {
  private rec: any = null;
  private wantRunning = false;
  constructor(private opts: RecognizerOptions) {}

  start(): boolean {
    if (!SR) return false;
    this.stop();
    const rec = new SR();
    rec.lang = speechCode(this.opts.lang);
    rec.interimResults = true;
    rec.continuous = !!this.opts.continuous;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const alt = res[0];
        const conf = typeof alt.confidence === 'number' && alt.confidence > 0 ? alt.confidence : null;
        this.opts.onResult({ text: alt.transcript, confidence: conf, final: res.isFinal });
      }
    };
    rec.onerror = (e: any) => this.opts.onError?.(e.error ?? 'error');
    rec.onend = () => {
      // Continuous listening (Home, wake phrase): Chrome stops after silence, so restart.
      if (this.wantRunning && this.opts.continuous) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      this.opts.onEnd?.();
    };
    this.rec = rec;
    this.wantRunning = true;
    try {
      rec.start();
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.wantRunning = false;
    if (this.rec) {
      try {
        this.rec.onend = null;
        this.rec.abort();
      } catch {
        /* ignore */
      }
      this.rec = null;
      this.opts.onEnd?.();
    }
  }
}

// ---------- Synthesis ----------

let voicesCache: SpeechSynthesisVoice[] = [];
if (synthesisSupported()) {
  const load = () => (voicesCache = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function hasVoiceFor(lang: AppLang): boolean {
  if (!synthesisSupported()) return false;
  const code = speechCode(lang).toLowerCase();
  const prefix = code.slice(0, 2);
  // English is always available; others need an installed voice.
  if (prefix === 'en') return true;
  return voicesCache.some((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
}

let muted = false;
export const setMuted = (m: boolean) => {
  muted = m;
  if (m && synthesisSupported()) window.speechSynthesis.cancel();
};

/** Speak text in the user's language. Resolves when done (or immediately if speech is unavailable). */
export function speak(text: string, lang: AppLang, rate = 0.95): Promise<boolean> {
  return new Promise((resolve) => {
    if (muted || !synthesisSupported() || !text) return resolve(false);
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const code = speechCode(lang);
    u.lang = code;
    const voice = voicesCache.find((v) => v.lang.replace('_', '-') === code) ?? voicesCache.find((v) => v.lang.startsWith(code.slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
    // Safety net: some browsers never fire onend.
    setTimeout(() => resolve(true), Math.min(20000, 1500 + text.length * 90));
  });
}

export function stopSpeaking(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}
