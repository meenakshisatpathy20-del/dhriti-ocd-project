import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore, uid } from '../state/store';
import { phrase } from '../../shared/i18n/phrases';
import { extractEpisode, type EpisodeExtraction } from '../../shared/nlp/extract';
import { parseRating } from '../../shared/nlp/numbers';
import { parseOutcome, type ErpOutcome } from '../../shared/nlp/answers';
import { classify } from '../../shared/nlp/classifier';
import { guardReply } from '../../shared/nlp/reassurance';
import { speak } from '../lib/speech';
import { playMood, stopMusic } from '../lib/music';
import { VoiceInput } from '../components/VoiceInput';
import { LineChart, Ring } from '../components/Charts';
import { Mascot, Celebrate } from '../components/Mascot';

const ROUND_SEC = 120;
const MAX_ROUNDS = 7; // up to 14 minutes

type Stage = 'describe' | 'card' | 'waiting' | 'rate' | 'outcome' | 'done';

/**
 * Guided exposure and response prevention for the moment an urge hits.
 * Speak the urge -> Dhriti extracts trigger, fear and compulsion -> two-minute
 * waiting rounds with a spoken 0-10 anxiety rating -> outcome, never judged.
 */
export default function Coach() {
  const { data, update, careLevel } = useStore();
  const loc = useLocation() as { state?: { utterance?: string; episode?: EpisodeExtraction; situation?: string } };
  const navigate = useNavigate();
  const lang = data.profile.lang;
  const [utterance, setUtterance] = useState(loc.state?.utterance ?? loc.state?.situation ?? '');
  const [ep, setEp] = useState<EpisodeExtraction | null>(loc.state?.episode ?? (loc.state?.situation ? extractEpisode(loc.state.situation) : null));
  const [stage, setStage] = useState<Stage>(ep ? 'card' : 'describe');
  const [suds, setSuds] = useState<{ sec: number; value: number }[]>([]);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(ROUND_SEC);
  const [outcome, setOutcome] = useState<ErpOutcome | null>(null);
  const [hint, setHint] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const started = useRef(0);

  useEffect(() => () => { window.clearInterval(timer.current); stopMusic(); }, []);

  useEffect(() => {
    if (stage === 'card' && ep) speak(`${phrase('urgeAck', lang)} ${phrase('askAnxiety', lang)}`, lang);
  }, [stage, ep, lang]);

  const describe = (text: string) => {
    if (classify(text).intent === 'SELF_HARM') return navigate('/crisis');
    setUtterance(text);
    setEp(extractEpisode(text));
    setStage('card');
  };

  const startRound = () => {
    setStage('waiting');
    setLeft(ROUND_SEC);
    if (!started.current) started.current = Date.now();
    if (round === 0) {
      speak(phrase('urgeWait', lang), lang);
      playMood('focus', 0.22);
    }
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(timer.current);
          setStage('rate');
          speak(phrase('askAnxiety', lang), lang);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  };

  const rate = (text: string) => {
    const c = classify(text);
    if (c.intent === 'SELF_HARM') return navigate('/crisis');
    if (c.intent === 'REASSURANCE') {
      // Even mid-session, never answer certainty questions.
      const r = guardReply(phrase('reassuranceDecline', lang)).text;
      setHint(r);
      speak(r, lang);
      update((d) => ({ ...d, reassurance: [...d.reassurance, { at: Date.now(), text }] }));
      return;
    }
    const v = parseRating(text);
    if (v === null) {
      setHint(phrase('askNumber', lang));
      speak(phrase('askNumber', lang), lang);
      return;
    }
    recordSuds(v);
  };

  const recordSuds = (v: number) => {
    setHint('');
    const sec = started.current ? Math.round((Date.now() - started.current) / 1000) : 0;
    const next = [...suds, { sec, value: v }];
    setSuds(next);
    const nextRound = round + 1;
    setRound(nextRound);
    const peak = Math.max(...next.map((s) => s.value));
    const falling = next.length >= 2 && v <= peak - 3;
    if (nextRound >= MAX_ROUNDS || v <= 2 || falling) {
      setStage('outcome');
      speak(`${falling ? (lang === 'hi' ? 'Dekhiye, anxiety apne aap kam hui. ' : 'Notice how the anxiety came down on its own. ') : ''}${phrase('askOutcome', lang)}`, lang);
    } else {
      speak(lang === 'hi' ? 'Theek hai. Do minute aur.' : 'Okay. Two more minutes.', lang);
      startRound();
    }
  };

  const finish = (o: ErpOutcome) => {
    setOutcome(o);
    setStage('done');
    stopMusic();
    const durationSec = started.current ? Math.round((Date.now() - started.current) / 1000) : 0;
    update((d) => ({
      ...d,
      episodes: [...d.episodes, { id: uid(), at: new Date().toISOString(), utterance, extraction: ep!, suds, outcome: o, durationSec, source: loc.state?.situation ? 'ladder' : 'urge' }],
    }));
    speak(phrase('noJudgement', lang), lang);
  };

  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, '0');

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Urge coach · exposure and response prevention</div>
        <h1>Let the urge rise and fall, without the compulsion</h1>
        {careLevel === 4 && <div className="notice">Your screening suggests severe symptoms. Please practise ERP with a psychiatrist or psychologist; use this coach only as they advise.</div>}
      </div>

      {stage === 'describe' && (
        <div className="card stack">
          <h2>What is the urge right now?</h2>
          <p className="muted">For example: "phir se haath dhone ka mann ho raha hai" or "I need to check the gas again".</p>
          <VoiceInput onUtterance={(u) => describe(u.text)} autoStart />
        </div>
      )}

      {ep && stage !== 'describe' && (
        <div className="grid two">
          <div className="card stack">
            <span className="badge info" style={{ alignSelf: 'flex-start', textTransform: 'capitalize' }}>{ep.compulsion}</span>
            <p className="faint" style={{ margin: 0 }}>"{utterance}"</p>
            <table>
              <tbody>
                <tr><th>Trigger</th><td>{ep.trigger ?? 'Not mentioned'}</td></tr>
                <tr><th>Fear</th><td>{ep.fear}</td></tr>
                <tr><th>Urge</th><td>{ep.urge}</td></tr>
              </tbody>
            </table>
            {suds.length > 0 && <LineChart points={suds.map((s) => ({ x: s.sec / 60, y: s.value }))} label="Anxiety over time" />}
          </div>

          <div className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            {stage === 'card' && (
              <>
                <h2>{phrase('askAnxiety', lang)}</h2>
                <div className="row" style={{ justifyContent: 'center' }}>
                  {Array.from({ length: 11 }, (_, n) => (
                    <button key={n} className="chip" onClick={() => { recordFirst(n); }}>{n}</button>
                  ))}
                </div>
                <VoiceInput size="small" onUtterance={(u) => { const v = parseRating(u.text); if (v !== null) recordFirst(v); else rate(u.text); }} />
              </>
            )}
            {stage === 'waiting' && (
              <>
                <Ring value={ROUND_SEC - left} max={ROUND_SEC}>
                  <div><div style={{ fontSize: '2.4rem', fontFamily: 'var(--display)' }}>{mins}:{secs}</div><small className="muted">round {round + 1}</small></div>
                </Ring>
                <p className="muted">You don't have to do anything with the urge. Notice it. Let it be there.</p>
                <button className="btn small ghost" onClick={() => { window.clearInterval(timer.current); setLeft(0); setStage('rate'); }}>Rate now</button>
              </>
            )}
            {stage === 'rate' && (
              <>
                <h2>{phrase('askAnxiety', lang)}</h2>
                <div className="row" style={{ justifyContent: 'center' }}>
                  {Array.from({ length: 11 }, (_, n) => <button key={n} className="chip" onClick={() => recordSuds(n)}>{n}</button>)}
                </div>
                <VoiceInput size="small" autoStart onUtterance={(u) => rate(u.text)} />
              </>
            )}
            {stage === 'outcome' && (
              <>
                <h2>{phrase('askOutcome', lang)}</h2>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn" onClick={() => finish('resisted')}>Resisted</button>
                  <button className="btn" onClick={() => finish('delayed')}>Delayed</button>
                  <button className="btn" onClick={() => finish('did')}>Did it</button>
                </div>
                <VoiceInput size="small" autoStart onUtterance={(u) => { const o = parseOutcome(u.text); if (o) finish(o); }} />
              </>
            )}
            {stage === 'done' && (
              <>
                {outcome !== 'did' && <Celebrate />}
                <Mascot mood={outcome === 'did' ? 'calm' : 'proud'} size={110} />
                <h2>{outcome === 'did' ? 'That is okay.' : 'Well done.'}</h2>
                <p className="muted">{phrase('noJudgement', 'en')} {outcome !== 'did' && suds.length > 1 ? `Your anxiety went from ${Math.max(...suds.map((s) => s.value))} to ${suds[suds.length - 1].value}.` : ''}</p>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn primary" onClick={() => navigate('/')}>Done</button>
                  <button className="btn" onClick={() => navigate('/report')}>See my progress</button>
                </div>
              </>
            )}
            {hint && <div className="notice">{hint}</div>}
          </div>
        </div>
      )}
    </div>
  );

  function recordFirst(v: number) {
    setSuds([{ sec: 0, value: v }]);
    started.current = Date.now();
    startRound();
  }
}
