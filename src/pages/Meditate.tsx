import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore, uid } from '../state/store';
import { phrase } from '../../shared/i18n/phrases';
import { speak, stopSpeaking } from '../lib/speech';
import { MicMeter, SustainTracker } from '../lib/mic';
import { MOOD_LIST, moodFor, playMood, playingMood, stopMusic, type Mood } from '../lib/music';
import { classify } from '../../shared/nlp/classifier';
import { tokens, containsPhrase } from '../../shared/nlp/normalize';
import { VoiceInput } from '../components/VoiceInput';

type Mode = 'bhramari' | 'label' | 'bodyscan' | 'music';

export default function Meditate() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'bhramari');
  useEffect(() => () => { stopMusic(); stopSpeaking(); }, []);

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Meditate · you speak, not just listen</div>
        <h1>Voice-led practice</h1>
        <p className="muted">Each practice uses your voice: your hum, your words, your answers.</p>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {([['bhramari', 'Bhramari humming'], ['label', 'Thought labelling'], ['bodyscan', 'Spoken body scan'], ['music', 'Music']] as [Mode, string][]).map(([m, l]) => (
          <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>{l}</button>
        ))}
      </div>
      {mode === 'bhramari' && <Bhramari />}
      {mode === 'label' && <ThoughtLabel />}
      {mode === 'bodyscan' && <BodyScan />}
      {mode === 'music' && <MusicPanel />}
    </div>
  );
}

/** Bhramari: hum on the out-breath; the mic detects a sustained voiced pitch and paces you. */
function Bhramari() {
  const { data, update } = useStore();
  const lang = data.profile.lang;
  const [running, setRunning] = useState(false);
  const [hums, setHums] = useState<number[]>([]);
  const [live, setLive] = useState(0);
  const [pitch, setPitch] = useState<number | null>(null);
  const meter = useRef<MicMeter | null>(null);
  const started = useRef(0);
  const humsRef = useRef<number[]>([]);

  const start = async () => {
    const m = new MicMeter();
    meter.current = m;
    const tracker = new SustainTracker(1500, 350);
    try {
      await m.start();
      await m.calibrate(1500);
    } catch {
      return alert('Microphone permission is needed for Bhramari.');
    }
    setRunning(true);
    started.current = Date.now();
    playMood('om', 0.04);
    await speak(lang === 'hi' ? 'Aankhein band kijiye. Saans andar lijiye, aur saans chhodte hue mmm gungunaaiye.' : 'Close your eyes. Breathe in, and as you breathe out, hum mmm.', lang);
    m.setHandler((f) => {
      const voiced = f.pitch !== null && f.rms > m.baseline * 2;
      setPitch(voiced ? Math.round(f.pitch!) : null);
      setLive(tracker.current(f.t));
      const ended = tracker.update(voiced, f.t);
      if (ended !== null) {
        const h = humsRef.current;
        const msg = h.length && ended > h[h.length - 1] ? phrase('humGood', lang) : phrase('humLonger', lang);
        humsRef.current = [...h, ended];
        setHums(humsRef.current);
        speak(msg, lang, 0.85);
      }
    });
  };

  const stop = () => {
    meter.current?.stop();
    stopMusic();
    setRunning(false);
    if (hums.length) {
      update((d) => ({ ...d, practice: [...d.practice, { id: uid(), at: new Date().toISOString(), kind: 'bhramari', detail: `${hums.length} hums, longest ${(Math.max(...hums) / 1000).toFixed(1)}s`, minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)) }] }));
    }
  };

  useEffect(() => () => meter.current?.stop(), []);
  const longest = Math.max(0, ...hums);

  return (
    <div className="grid two">
      <div className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="calm-star" style={{ position: 'relative', transform: `scale(${1 + Math.min(live / 8000, 0.8)})` }} />
        <h2>{running ? (live > 0 ? `Humming… ${(live / 1000).toFixed(1)}s` : 'Breathe in, then hum') : 'Bhramari pranayama'}</h2>
        <p className="muted">{pitch ? `Voice detected at ${pitch} Hz` : 'Humming bee breath calms the body by lengthening the out-breath.'}</p>
        {!running ? <button className="btn primary" onClick={start}>Begin</button> : <button className="btn" onClick={stop}>Finish</button>}
      </div>
      <div className="card stack">
        <h3>This session</h3>
        <p>Hums: <b>{hums.length}</b> · Longest: <b>{(longest / 1000).toFixed(1)}s</b></p>
        <div className="row">{hums.map((h, i) => <span key={i} className="badge info">{(h / 1000).toFixed(1)}s</span>)}</div>
        <p className="faint">Aim for 6-10 hums, each a little longer than the last. Stop if you feel dizzy.</p>
      </div>
    </div>
  );
}

/** Thought labelling (cognitive defusion): say the thought, then label it. No neutralising rituals. */
function ThoughtLabel() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const lang = data.profile.lang;
  const [stage, setStage] = useState<'thought' | 'label' | 'pass'>('thought');
  const [count, setCount] = useState(0);
  const [last, setLast] = useState('');

  useEffect(() => {
    speak(lang === 'hi' ? 'Jo vichaar pareshaan kar raha hai, use zor se boliye. Use rokne ki zaroorat nahi.' : 'Say the thought that is bothering you, out loud. You do not need to push it away.', lang);
  }, [lang]);

  const onThought = (text: string) => {
    if (classify(text).intent === 'SELF_HARM') return navigate('/crisis');
    setLast(text);
    setStage('label');
    speak(phrase('labelThought', lang), lang);
  };

  const onLabel = (text: string) => {
    const t = tokens(text);
    const labelled = ['ocd', 'just a thought', 'sirf ek vichaar', 'bol raha hai', 'talking', 'பேசுகிறது', 'কথা বলছে'].some((p) => containsPhrase(t, p));
    if (!labelled) {
      speak(lang === 'hi' ? "Boliye: 'Yeh OCD bol raha hai.'" : "Try saying: 'This is the OCD talking.'", lang);
      return;
    }
    setCount((c) => c + 1);
    setStage('pass');
    speak(lang === 'hi' ? 'Bahut achha. Vichaar ko baadal ki tarah jaane dijiye. Hum use cancel nahi karte, bas dekhte hain.' : 'Good. Let it drift past like a cloud. We do not cancel it, we just notice it.', lang);
    update((d) => ({ ...d, practice: [...d.practice, { id: uid(), at: new Date().toISOString(), kind: 'label', detail: 'Labelled one intrusive thought', minutes: 1 }] }));
  };

  return (
    <div className="card stack" style={{ maxWidth: 640 }}>
      {stage === 'thought' && (<><h2>Say the thought out loud</h2><VoiceInput onUtterance={(u) => onThought(u.text)} /></>)}
      {stage === 'label' && (
        <>
          <p className="faint">"{last}"</p>
          <h2>{lang === 'hi' ? "Ab boliye: 'Yeh OCD bol raha hai.'" : "Now say: 'This is the OCD talking.'"}</h2>
          <VoiceInput onUtterance={(u) => onLabel(u.text)} autoStart />
        </>
      )}
      {stage === 'pass' && (
        <>
          <h2>Let it pass ☁️</h2>
          <p className="muted">Notice the thought without arguing, praying it away or replacing it. That is the skill. Labelled today: {count}.</p>
          <button className="btn" onClick={() => setStage('thought')}>Another thought</button>
        </>
      )}
      <div className="notice info">Why no "cancelling" chant? In OCD a ritual to undo a thought becomes a new compulsion. Labelling and letting it pass weakens the cycle instead.</div>
    </div>
  );
}

const SCAN = ['forehead and eyes', 'jaw and mouth', 'shoulders', 'chest', 'stomach', 'hands', 'legs and feet'];

/** Spoken body scan that adapts to where the user says the tension is. */
function BodyScan() {
  const { data } = useStore();
  const lang = data.profile.lang;
  const [step, setStep] = useState(-1);
  const [focus, setFocus] = useState<string | null>(null);

  const go = async (i: number) => {
    setStep(i);
    if (i >= SCAN.length) {
      await speak(lang === 'hi' ? 'Body scan poora hua. Dheere se aankhein kholiye.' : 'The body scan is complete. Gently open your eyes.', lang);
      return;
    }
    const part = SCAN[i];
    const extra = focus && part.includes(focus) ? (lang === 'hi' ? ' Yahan thoda zyada samay dete hain.' : ' We will stay here a little longer.') : '';
    await speak(`${lang === 'hi' ? 'Dhyan le jaiye' : 'Bring your attention to your'} ${part}. ${lang === 'hi' ? 'Saans chhodte hue isse dheela chhodiye.' : 'As you breathe out, let it soften.'}${extra}`, lang, 0.85);
  };

  return (
    <div className="card stack" style={{ maxWidth: 640 }}>
      {step === -1 && (
        <>
          <h2>{lang === 'hi' ? 'Shareer mein tension kahan hai?' : 'Where do you feel tension right now?'}</h2>
          <VoiceInput onUtterance={(u) => {
            const t = u.text.toLowerCase();
            const map: [string[], string][] = [[['sir', 'head', 'forehead', 'aankh'], 'forehead'], [['jaw', 'jabda', 'muh'], 'jaw'], [['kandhe', 'shoulder', 'gardan', 'neck'], 'shoulders'], [['chest', 'seena', 'chhati', 'dil'], 'chest'], [['pet', 'stomach'], 'stomach'], [['haath', 'hand'], 'hands'], [['pair', 'leg', 'feet'], 'legs']];
            setFocus(map.find(([ws]) => ws.some((w) => t.includes(w)))?.[1] ?? null);
            go(0);
          }} />
          <button className="btn" onClick={() => go(0)}>Skip and begin</button>
        </>
      )}
      {step >= 0 && step < SCAN.length && (
        <>
          <h2 style={{ textTransform: 'capitalize' }}>{SCAN[step]}</h2>
          <div className="progress"><div style={{ width: `${(step / SCAN.length) * 100}%` }} /></div>
          <button className="btn primary" onClick={() => go(step + 1)}>Next</button>
        </>
      )}
      {step >= SCAN.length && <h2>Complete 🌙</h2>}
    </div>
  );
}

/** Assigned music: Dhriti suggests a soundscape for each situation. */
function MusicPanel() {
  const [playing, setPlaying] = useState<Mood | null>(playingMood());
  const hour = new Date().getHours();
  const suggested = moodFor(hour >= 21 || hour < 5 ? 'night' : 'default');
  return (
    <div className="grid two">
      {MOOD_LIST.map((m) => (
        <div key={m.id} className="card stack">
          <div className="spread">
            <h3 style={{ margin: 0 }}>{m.label}</h3>
            {m.id === suggested && <span className="badge ok">Suggested now</span>}
          </div>
          <p className="muted" style={{ margin: 0 }}>{m.use}</p>
          <button className="btn" onClick={() => { if (playing === m.id) { stopMusic(); setPlaying(null); } else { playMood(m.id); setPlaying(m.id); } }}>{playing === m.id ? 'Stop' : 'Play'}</button>
        </div>
      ))}
      <p className="faint">Soundscapes are generated live on your phone, so they work offline. Panic mode plays "Calm night sky", the urge coach plays "Steady orbit", and Bhramari plays the "Om drone" automatically.</p>
    </div>
  );
}
