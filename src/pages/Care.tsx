import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { api, ApiError } from '../lib/api';

interface Pro {
  id: string;
  name: string;
  role: 'psychiatrist' | 'clinical_psychologist' | 'counsellor';
  council: string;
  registrationNumber: string;
  qualification: string;
  experienceYears: number;
  specialisations: string[];
  languages: string[];
  city: string;
  modes: ('online' | 'offline')[];
  feeInr: number;
  bio: string;
  slots: string[];
  demo?: boolean;
}

interface BookingRow {
  id: string;
  slot: string;
  mode: string;
  status: string;
  professional: Pro;
}

const ROLE: Record<Pro['role'], string> = { psychiatrist: 'Psychiatrist', clinical_psychologist: 'Clinical psychologist (RCI)', counsellor: 'Counsellor' };
const LANG_NAME: Record<string, string> = { hi: 'Hindi', en: 'English', ta: 'Tamil', bn: 'Bengali' };

export default function Care() {
  const { data, careLevel, route } = useStore();
  const navigate = useNavigate();
  const [pros, setPros] = useState<Pro[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [langFilter, setLangFilter] = useState(true);
  const [mode, setMode] = useState<'' | 'online' | 'offline'>('');
  const [pick, setPick] = useState<{ pro: Pro; slot: string; mode: 'online' | 'offline' } | null>(null);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  const load = () => {
    const q = new URLSearchParams({ careLevel: String(careLevel) });
    if (langFilter) q.set('lang', LANG_NAME[data.profile.lang]);
    if (mode) q.set('mode', mode);
    api<Pro[]>(`/api/professionals?${q}`).then((p) => { setPros(p); setOffline(false); }).catch(() => setOffline(true));
    api<BookingRow[]>(`/api/bookings?patientId=${data.profile.patientId}`).then(setBookings).catch(() => undefined);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [careLevel, langFilter, mode]);

  const book = async () => {
    if (!pick) return;
    setError('');
    try {
      const b = await api<{ id: string }>('/api/bookings', { method: 'POST', json: { professionalId: pick.pro.id, patientId: data.profile.patientId, patientAlias: data.profile.name, slot: pick.slot, mode: pick.mode } });
      setPick(null);
      navigate(`/care/booking/${b.id}`);
    } catch (e) {
      setError((e as ApiError).message);
      load();
    }
  };

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Verified professionals</div>
        <h1>Talk to a psychiatrist or psychologist</h1>
        <p className="muted">Every professional is checked against the NMC / State Medical Council or the RCI register before they appear here. Your care level ({careLevel} · {route.label}) decides who is shown{careLevel >= 4 ? ': psychiatrists only' : careLevel === 3 ? ': psychiatrists and RCI clinical psychologists' : ''}.</p>
      </div>

      {offline && <div className="notice">Could not reach the Dhriti server. Start it with <code>npm run dev</code>.</div>}

      {bookings.length > 0 && (
        <div className="card stack" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Your sessions</h3>
          {bookings.map((b) => (
            <div key={b.id} className="spread">
              <span>{b.professional?.name} · {new Date(b.slot).toLocaleString()} · {b.mode}</span>
              <span className="row"><span className="badge info">{b.status}</span><button className="btn small" onClick={() => navigate(`/care/booking/${b.id}`)}>Open chat</button></span>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginBottom: 14 }}>
        <button className={`chip ${langFilter ? 'on' : ''}`} onClick={() => setLangFilter(!langFilter)}>Speaks {LANG_NAME[data.profile.lang]}</button>
        {(['', 'online', 'offline'] as const).map((m) => <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>{m || 'Any mode'}</button>)}
      </div>

      <div className="grid two">
        {pros.length === 0 && !offline && <p className="faint">No verified professionals match these filters yet.</p>}
        {pros.map((p) => (
          <div key={p.id} className="card stack">
            <div className="spread">
              <h3 style={{ margin: 0 }}>{p.name}</h3>
              <span className="badge ok">✓ verified</span>
            </div>
            <small className="muted">{ROLE[p.role]} · {p.qualification} · {p.experienceYears} yrs · {p.city}</small>
            <small className="faint">{p.council} · Reg. {p.registrationNumber}</small>
            <p style={{ margin: 0 }}>{p.bio}</p>
            <div className="row">{p.specialisations.map((s) => <span key={s} className="badge">{s}</span>)}</div>
            <small className="muted">Languages: {p.languages.join(', ')} · {p.modes.join(' & ')} · ₹{p.feeInr}/session</small>
            <div className="row">
              {p.slots.slice(0, 6).map((s) => (
                <button key={s} className={`chip ${pick?.slot === s && pick.pro.id === p.id ? 'on' : ''}`} onClick={() => setPick({ pro: p, slot: s, mode: p.modes[0] })}>
                  {new Date(s).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                </button>
              ))}
            </div>
            {pick?.pro.id === p.id && (
              <div className="stack">
                <div className="row">
                  {p.modes.map((m) => <button key={m} className={`chip ${pick.mode === m ? 'on' : ''}`} onClick={() => setPick({ ...pick, mode: m })}>{m}</button>)}
                </div>
                <button className="btn primary" onClick={book}>Book {new Date(pick.slot).toLocaleString()} ({pick.mode})</button>
                {error && <div className="field-error">{error}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="faint" style={{ marginTop: 16 }}>Profiles marked "demo" are fictional examples for this research prototype.</p>
    </div>
  );
}
