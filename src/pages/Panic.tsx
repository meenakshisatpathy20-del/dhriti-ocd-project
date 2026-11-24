import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, uid } from '../state/store';
import { phrase } from '../../shared/i18n/phrases';
import { speak, Recognizer, recognitionSupported, stopSpeaking } from '../lib/speech';
import { MicMeter, SustainTracker } from '../lib/mic';
import { playMood, stopMusic } from '../lib/music';
import { classify } from '../../shared/nlp/classifier';
import { tokens, containsPhrase } from '../../shared/nlp/normalize';

const CALL_FAMILY = ['maa ko bulao', 'mummy ko bulao', 'papa ko bulao', 'call my contact', 'call mom', 'call my mother', 'ghar pe call', 'family ko bulao'];
const TARGET_BREATHS = 6;

type Phase = 'start' | 'calibrating' | 'in' | 'out' | 'listen' | 'done';

/**
 * Voice panic mode.
 * Cycle: breathe in (spoken cue) -> breathe out into the mic (exhale detected
 * against a calibrated noise floor; the star dims as exhales lengthen) ->
 * every 2 breaths, a short listening window for "Maa ko bulao" or "theek hoon".
 * The mic meter and speech recognition never run at the same time.
 */
export default function Panic() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const { lang, trustedContact } = data.profile;
  const [phase, setPhase] = useState<Phase>('start');
  const [breaths, setBreaths] = useState<number[]>([]);
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState('');
  const [micError, setMicError] = useState(false);
  const meter = useRef<MicMeter | null>(null);
  const alive = useRef(true);
  const startedAt = useRef(Date.now());

  const wa = trustedContact ? `https://wa.me/91${trustedContact.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(phrase('familyAlert', lang))}` : null;

  useEffect(() => {
    alive.current = true;
    playMood('calm', 0.06);
    return () => {
      alive.current = false;
      meter.current?.stop();
      stopMusic();
      stopSpeaking();
    };
  }, []);

  const exhale = async (): Promise<number> => {
    const m = meter.current;
    if (!m) return 0;
    if (!m.running) await m.start();
    const tracker = new SustainTracker(1000);
    return new Promise((resolve) => {
      const deadline = performance.now() + 9000;
      let done = false;
      m.setHandler((f) => {
        if (done) return;
        const active = f.rms > m.baseline * 1.5;
        setLevel(Math.min(1, f.rms / (m.baseline * 6)));
        const ended = tracker.update(active, f.t);
        if (ended !== null || f.t > deadline) {
          done = true;
          m.setHandler(() => undefined);
          resolve(ended ?? tracker.current(f.t));
        }
      });
    });
  };

  const listenWindow = (ms: number): Promise<string> =>
    new Promise((resolve) => {
      if (!recognitionSupported()) return resolve('');
      let heard = '';
      const rec = new Recognizer({ lang, onResult: (r) => { if (r.final) heard = r.text; }, onEnd: () => resolve(heard) });
      rec.start();
      setTimeout(() => rec.stop(), ms);
    });

  const run = async () => {
    startedAt.current = Date.now();
    let micOk = true;
    try {
      meter.current = new MicMeter();
      await meter.current.start(() => undefined);
      setPhase('calibrating');
      setNote(lang === 'hi' ? 'Ek pal shaant rahiye, main kamre ki awaaz sun rahi hoon…' : 'Stay quiet for a moment while I listen to the room…');
      await meter.current.calibrate(3000);
    } catch {
      micOk = false;
      setMicError(true);
    }
    await speak(phrase('panicStart', lang), lang, 0.85);
    const lengths: number[] = [];
    for (let i = 0; i < TARGET_BREATHS && alive.current; i++) {
      setPhase('in');
      setNote(phrase('panicBreatheIn', lang));
      await speak(phrase('panicBreatheIn', lang), lang, 0.8);
      await wait(2500);
      if (!alive.current) return;
      setPhase('out');
      setNote(phrase('panicBreatheOut', lang));
      await speak(phrase('panicBreatheOut', lang), lang, 0.8);
      const ms = micOk ? await exhale() : (await wait(5000), 5000);
      lengths.push(ms);
      setBreaths([...lengths]);
      if (i > 0 && ms > lengths[i - 1]) await speak(phrase('panicWell', lang), lang, 0.85);
      if (i % 2 === 1 && alive.current) {
        setPhase('listen');
        meter.current?.stop(); // one microphone consumer at a time
        setNote(lang === 'hi' ? 'Kuch kehna hai? "Maa ko bulao" ya "theek hoon".' : 'Want anything? Say "call my contact" or "I\'m okay".');
        const said = await listenWindow(4000);
        if (said) {
          const t = tokens(said);
          if (classify(said).intent === 'SELF_HARM') return navigate('/crisis');
          if (CALL_FAMILY.some((p) => containsPhrase(t, p)) && wa) {
            window.open(wa, '_blank');
          }
          if (['theek hoon', 'i am okay', "i'm okay", 'better', 'behtar', 'bas'].some((p) => containsPhrase(t, p))) break;
        }
      }
    }
    if (!alive.current) return;
    setPhase('done');
    setNote('');
    update((d) => ({ ...d, practice: [...d.practice, { id: uid(), at: new Date().toISOString(), kind: 'panic', detail: `${lengths.length} breaths, longest exhale ${(Math.max(0, ...lengths) / 1000).toFixed(1)}s`, minutes: Math.round((Date.now() - startedAt.current) / 60000) || 1 }] }));
    speak(lang === 'hi' ? 'Aapne bahut achha kiya. Main yahin hoon.' : 'You did really well. I am here.', lang);
  };

  const longest = Math.max(0, ...breaths);
  // The star dims as exhales lengthen: full brightness at 0s, dimmest at 8s.
  const dim = Math.min(0.85, longest / 8000 * 0.85);
  const pulse = phase === 'in' ? 1.25 : phase === 'out' ? 0.85 + level * 0.3 : 1;

  return (
    <div className="calm-screen">
      <div className="calm-star" style={{ opacity: 1 - dim, transform: `scale(${pulse})` }} />
      {phase === 'start' && (
        <>
          <h1>{lang === 'hi' ? 'Main yahin hoon.' : "I'm right here."}</h1>
          <p className="muted" style={{ maxWidth: 460 }}>We will breathe together. Breathe out slowly towards your phone's microphone. The star dims as your breath gets longer. Works with eyes closed.</p>
          <button className="btn primary" onClick={run}>Start breathing</button>
        </>
      )}
      {phase !== 'start' && (
        <>
          <h2 style={{ minHeight: '1.4em' }}>{phase === 'done' ? (lang === 'hi' ? 'Shabash.' : 'Well done.') : note}</h2>
          <p className="muted">Breaths: {breaths.length}/{TARGET_BREATHS} · longest exhale {(longest / 1000).toFixed(1)}s</p>
          {micError && <p className="faint">Microphone unavailable: follow the spoken timing instead.</p>}
        </>
      )}
      <div className="row" style={{ justifyContent: 'center' }}>
        {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer">Message {trustedContact!.name}</a>}
        <a className="btn" href="tel:14416">Tele-MANAS 14416</a>
        <button className="btn ghost" onClick={() => navigate('/')}>{phase === 'done' ? 'Back home' : 'Exit'}</button>
      </div>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
