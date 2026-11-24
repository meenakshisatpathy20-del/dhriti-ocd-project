import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LANGS, phrase, type AppLang } from '../../shared/i18n/phrases';
import { useStore } from '../state/store';
import { speak } from '../lib/speech';
import { VoiceInput } from '../components/VoiceInput';
import { Logo } from '../components/Icons';
import { tokens } from '../../shared/nlp/normalize';
import { parseYesNo } from '../../shared/nlp/answers';

const LANG_WORDS: [string[], AppLang][] = [
  [['hindi', 'हिंदी', 'हिन्दी', 'hinglish'], 'hi'],
  [['english', 'angrezi'], 'en'],
  [['tamil', 'தமிழ்'], 'ta'],
  [['bengali', 'bangla', 'বাংলা'], 'bn'],
];

export default function Onboarding() {
  const { data, setProfile } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.profile.name);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const lang = data.profile.lang;

  const pickLang = (l: AppLang) => {
    setProfile({ lang: l });
    speak(phrase('greeting', l), l);
    setStep(1);
  };

  const finish = () => {
    setProfile({
      name: name.trim(),
      onboarded: true,
      consentAt: new Date().toISOString(),
      trustedContact: contactPhone.trim() ? { name: contactName.trim() || 'Trusted contact', phone: contactPhone.trim() } : null,
    });
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 620, width: '100%' }}>
        <div className="row" style={{ marginBottom: 18 }}>
          <Logo width={40} height={40} />
          <div>
            <h1 style={{ margin: 0 }}>Dhriti</h1>
            <small className="muted">धृति · steadfast resolve · a voice-first OCD companion</small>
          </div>
        </div>
        <div className="progress" style={{ marginBottom: 22 }}><div style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>

        {step === 0 && (
          <div className="stack">
            <h2>{phrase('askLanguage', 'en')}</h2>
            <p className="muted">{phrase('askLanguage', 'hi')}</p>
            <div className="grid two">
              {LANGS.map((l) => (
                <button key={l.id} className="btn" onClick={() => pickLang(l.id)}>{l.native} · {l.label}</button>
              ))}
            </div>
            <p className="faint">Or say it out loud:</p>
            <VoiceInput
              size="small"
              onUtterance={(u) => {
                const t = tokens(u.text);
                const hit = LANG_WORDS.find(([words]) => words.some((w) => t.includes(w)));
                if (hit) pickLang(hit[1]);
              }}
            />
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <h2>{lang === 'hi' ? 'Aapko kis naam se bulaun?' : 'What should I call you?'}</h2>
            <p className="muted">A first name or a nickname is enough. It stays on this phone.</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or nickname" autoFocus />
            <VoiceInput size="small" onUtterance={(u) => setName(u.text.replace(/^(my name is|mera naam|main)\s+/i, '').replace(/\s+(hai|hoon|hun)$/i, '').trim())} />
            <div className="spread">
              <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn primary" onClick={() => setStep(2)} disabled={!name.trim()}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <h2>Before we begin</h2>
            <div className="notice info">{phrase('disclaimer', lang)}</div>
            <ul className="muted" style={{ paddingLeft: 20, margin: 0 }}>
              <li>Your diary, scores and practice history are stored only on this device.</li>
              <li>Your voice is turned into text by your browser's speech service and is never saved by Dhriti.</li>
              <li>If you mention self-harm, Dhriti will show the free Tele-MANAS helpline (14416).</li>
              <li>You choose if and when to share a report with a professional.</li>
            </ul>
            <p className="faint">Say "haan / yes" or tap to agree.</p>
            <VoiceInput size="small" onUtterance={(u) => parseYesNo(u.text) && setStep(3)} />
            <div className="spread">
              <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn primary" onClick={() => setStep(3)}>I understand and agree</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h2>{lang === 'hi' ? 'Mushkil waqt mein kisko bulayein?' : 'Who should we alert in a hard moment?'}</h2>
            <p className="muted">Optional. In panic mode, saying "Maa ko bulao" or "call my contact" opens a ready WhatsApp message to this person.</p>
            <label>Name</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Maa" />
            <label>Mobile number</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="10-digit mobile" inputMode="tel" />
            <div className="spread" style={{ marginTop: 8 }}>
              <button className="btn ghost" onClick={finish}>Skip for now</button>
              <button className="btn primary" onClick={finish}>Start using Dhriti</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
