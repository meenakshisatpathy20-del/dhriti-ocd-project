import { useStore, uid } from '../state/store';
import { classify } from '../../shared/nlp/classifier';
import { parseRating } from '../../shared/nlp/numbers';
import { useNavigate } from 'react-router-dom';
import { speak } from '../lib/speech';
import { VoiceInput } from '../components/VoiceInput';

export default function Journal() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const lang = data.profile.lang;
  const entries = [...data.diary].reverse();

  const add = (text: string) => {
    const c = classify(text);
    if (c.intent === 'SELF_HARM') return navigate('/crisis');
    update((d) => ({ ...d, diary: [...d.diary, { id: uid(), at: new Date().toISOString(), text, mood: parseRating(text) }] }));
    speak(lang === 'hi' ? 'Save ho gaya. Shukriya.' : 'Saved. Thank you for sharing.', lang);
    if (c.riskCheck) speak(lang === 'hi' ? 'Agar kabhi khud ko nuksan ke vichaar aayein, Tele-MANAS 14416 free hai.' : 'If you ever have thoughts of self-harm, Tele-MANAS 14416 is free.', lang);
  };

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Voice diary · private to this device</div>
        <h1>How was your day?</h1>
        <p className="muted">Just talk. Your entries help you and, if you choose, your doctor see patterns over time.</p>
      </div>
      <div className="grid two">
        <div className="card"><VoiceInput onUtterance={(u) => add(u.text)} prompt='e.g. "Aaj college gayi, sirf do baar haath dhoye"' /></div>
        <div className="card stack">
          <h3>Entries ({entries.length})</h3>
          {entries.length === 0 && <p className="faint">No entries yet.</p>}
          {entries.map((e) => (
            <div key={e.id} className="card tight">
              <div className="spread"><small className="muted">{new Date(e.at).toLocaleString()}</small>{e.mood !== null && <span className="badge info">mood {e.mood}/10</span>}</div>
              <p style={{ margin: '6px 0 0' }}>{e.text}</p>
              <button className="btn small ghost" onClick={() => update((d) => ({ ...d, diary: d.diary.filter((x) => x.id !== e.id) }))}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
