import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { askAgent } from '../lib/api';
import { speak, Recognizer, recognitionSupported } from '../lib/speech';
import { useAgentActions } from '../hooks/useActions';
import { VoiceInput } from '../components/VoiceInput';
import * as I from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { countToday } from '../../shared/nlp/reassurance';
import { tokens, containsPhrase } from '../../shared/nlp/normalize';
import type { VoiceUtterance } from '../hooks/useVoice';
import type { AgentResponse } from '../../shared/agent/types';

const WAKE = ['dhriti madad', 'dhriti help', 'saans nahi aa rahi', "can't breathe", 'panic attack'];

export default function Home() {
  const { data, update, route, careLevel, latestScreening } = useStore();
  const navigate = useNavigate();
  const runActions = useAgentActions();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<AgentResponse | null>(null);
  const [wake, setWake] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const { profile } = data;
  const hi = profile.lang === 'hi';
  const lastReply = [...data.chat].reverse().find((m) => m.role === 'assistant');
  const daysSinceScreen = latestScreening ? (Date.now() - Date.parse(latestScreening.at)) / 86400000 : null;

  // Optional hands-free wake phrase: listens continuously while Home is open.
  useEffect(() => {
    if (!wake || !recognitionSupported()) return;
    const rec = new Recognizer({
      lang: profile.lang,
      continuous: true,
      onResult: (r) => {
        if (r.final && WAKE.some((w) => containsPhrase(tokens(r.text), w))) navigate('/panic');
      },
    });
    rec.start();
    return () => rec.stop();
  }, [wake, profile.lang, navigate]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [data.chat.length]);

  const onUtterance = async (u: VoiceUtterance) => {
    setBusy(true);
    update((d) => ({ ...d, chat: [...d.chat, { role: 'user' as const, content: u.text }].slice(-40) }));
    const res = await askAgent(u.text, {
      lang: profile.lang,
      careLevel,
      name: profile.name,
      plan: profile.carePlan?.text,
      reassurance: data.reassurance.slice(-20),
      history: data.chat.slice(-8),
    });
    setLast(res);
    update((d) => ({ ...d, chat: [...d.chat, { role: 'assistant' as const, content: res.reply }].slice(-40) }));
    setBusy(false);
    await speak(res.reply, profile.lang);
    runActions(res.actions, u.text);
  };

  const today = new Date().toDateString();
  const todays = data.episodes.filter((e) => new Date(e.at).toDateString() === today);
  const resisted = data.episodes.filter((e) => e.outcome === 'resisted' || e.outcome === 'delayed').length;

  const features = [
    { to: '/coach', icon: I.Wave, t: 'I have an urge', s: 'Urge aa raha hai · guided ERP' },
    { to: '/panic', icon: I.Star, t: 'Panic SOS', s: '"Dhriti, madad" · breathe with the star' },
    { to: '/screening', icon: I.Shield, t: 'Spoken screening', s: 'OCI-R + Y-BOCS by voice' },
    { to: '/meditate', icon: I.Lotus, t: 'Meditate', s: 'Bhramari hum, thought labelling, music' },
    { to: '/ladder', icon: I.Ladder, t: 'Exposure ladder', s: 'Build your ERP steps by voice' },
    { to: '/exposure', icon: I.Globe, t: '360° practice', s: 'Phone VR scenes, voice controlled' },
    { to: '/learn', icon: I.Book, t: 'Lessons', s: 'What OCD is and how ERP works' },
    { to: '/care', icon: I.Doctor, t: 'See a professional', s: 'Verified psychiatrists & psychologists' },
  ];

  return (
    <div>
      <div className="page-head spread">
        <div className="hello">
          <Mascot mood={busy ? 'listening' : 'happy'} size={92} />
          <div>
          <div className="kicker">Namaste{profile.name ? `, ${profile.name}` : ''}</div>
          <h1>{hi ? 'Abhi kya ho raha hai?' : "What's happening right now?"}</h1>
          <p className="muted" style={{ margin: 0 }}>{hi ? 'Mic dabaiye aur Hindi ya Hinglish mein boliye. Dhriti sunegi, samjhegi aur saath degi.' : 'Tap the mic and speak in your language. Dhriti listens, understands and guides you.'}</p>
          </div>
        </div>
        <span className={`badge ${careLevel >= 3 ? 'warn' : 'info'}`}>Care level {careLevel} · {route.label}</span>
      </div>

      <div className="grid two">
        <div className="card">
          <VoiceInput onUtterance={onUtterance} prompt={busy ? (hi ? 'Soch rahi hoon…' : 'Thinking…') : (hi ? 'Boliye, jaise: "phir se haath dhone ka mann ho raha hai"' : 'Try: "I need to check the lock again"')} />
          {lastReply && !busy && <div className="bubble assistant" style={{ maxWidth: '100%', marginTop: 12 }} aria-live="polite">{lastReply.content}</div>}
          {last && (
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
              <span className="badge info">{last.intent.toLowerCase().replace('_', ' ')}</span>
              <span className="badge">{last.engine === 'model' ? 'AI model' : 'on-device agent'}</span>
              {last.guarded.length > 0 && <span className="badge warn">guardrail applied</span>}
            </div>
          )}
          <label className="toggle-line">
            <input type="checkbox" checked={wake} onChange={(e) => setWake(e.target.checked)} />
            <span>{hi ? 'Hands-free: jab tak yeh screen khuli hai, "Dhriti, madad" sunti rahun' : 'Hands-free: listen for "Dhriti, madad" while this screen is open'}</span>
          </label>
          {wake && <div className="badge info" style={{ alignSelf: 'center', margin: '6px auto 0', display: 'flex', width: 'fit-content' }}>🎙 {hi ? 'Mic on hai, sirf is screen par' : 'Mic is on, only on this screen'}</div>}
        </div>

        <div className="card">
          <div className="spread" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>{hi ? 'Baatcheet' : 'Conversation'}</h3>
            {data.chat.length > 0 && <button className="btn small ghost" onClick={() => update((d) => ({ ...d, chat: [] }))}>Clear</button>}
          </div>
          <div className="chat" ref={chatRef}>
            {data.chat.length === 0 && <p className="faint">Your conversation with Dhriti appears here. It stays on this device.</p>}
            {data.chat.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>{m.content}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid four keep" style={{ marginTop: 16 }}>
        <div className="card tight stat"><span className="v">{todays.length}</span><span className="l">urges worked with today</span></div>
        <div className="card tight stat"><span className="v">{data.episodes.length ? Math.round((resisted / data.episodes.length) * 100) : 0}%</span><span className="l">resisted or delayed</span></div>
        <div className="card tight stat"><span className="v">{countToday(data.reassurance)}</span><span className="l">reassurance asks today</span></div>
        <div className="card tight stat"><span className="v">{latestScreening?.ybocs?.result.total ?? '–'}</span><span className="l">latest Y-BOCS</span></div>
      </div>

      <h2 style={{ marginTop: 28 }}>{hi ? 'Aapke tools' : 'Tools'}</h2>
      <div className="grid four keep">
        {features.map((f) => (
          <button key={f.to} className="feature" onClick={() => navigate(f.to)}>
            <span className="icon"><f.icon /></span>
            <span className="t">{f.t}</span>
            <span className="s">{f.s}</span>
          </button>
        ))}
      </div>

      {daysSinceScreen !== null && daysSinceScreen > 28 && (
        <div className="notice" style={{ marginTop: 18 }}>
          {hi ? 'Pichhli screening ko 4 hafte ho gaye. Dobara check karke dekhiye ki kitna badlaav aaya.' : 'It has been 4 weeks since your last screening. Re-check to see how much has changed.'} <a href="/screening" onClick={(e) => { e.preventDefault(); navigate('/screening'); }}>{hi ? 'Screening shuru karein →' : 'Re-screen →'}</a>
        </div>
      )}
      {!latestScreening && (
        <div className="notice info" style={{ marginTop: 18 }}>
          Take the spoken screening so Dhriti can match the right level of support to you. <a href="/screening" onClick={(e) => { e.preventDefault(); navigate('/screening'); }}>Start screening →</a>
        </div>
      )}
    </div>
  );
}
