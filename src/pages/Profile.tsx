import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { LANGS } from '../../shared/i18n/phrases';
import { hasVoiceFor, recognitionSupported } from '../lib/speech';
import { api } from '../lib/api';

export default function Profile() {
  const { data, setProfile, reset, route, careLevel } = useStore();
  const p = data.profile;
  const [health, setHealth] = useState<{ model: { configured: boolean; model: string | null } } | null>(null);
  useEffect(() => { api<typeof health>('/api/health').then(setHealth).catch(() => setHealth(null)); }, []);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dhriti-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const Toggle = ({ k, label, hint }: { k: 'quiet' | 'calm' | 'wisprMode' | 'muted'; label: string; hint: string }) => (
    <label className="spread card tight" style={{ cursor: 'pointer', margin: 0 }}>
      <span><b>{label}</b><br /><small className="muted">{hint}</small></span>
      <input type="checkbox" style={{ width: 22, height: 22 }} checked={p[k]} onChange={(e) => setProfile({ [k]: e.target.checked })} />
    </label>
  );

  return (
    <div>
      <div className="page-head"><div className="kicker">Profile & privacy</div><h1>{p.name || 'Your profile'}</h1>
        <p className="muted">Care level {careLevel} · {route.label}. {route.recommendation}</p>
      </div>
      <div className="grid two">
        <div className="card stack">
          <h3>Language</h3>
          <div className="row">{LANGS.map((l) => <button key={l.id} className={`chip ${p.lang === l.id ? 'on' : ''}`} onClick={() => setProfile({ lang: l.id })}>{l.native}</button>)}</div>
          <small className="muted">Speech recognition: {recognitionSupported() ? 'available' : 'not available in this browser (use Chrome, or Wispr Flow mode)'} · Spoken replies in this language: {hasVoiceFor(p.lang) ? 'available' : 'no voice installed, replies shown as text'}</small>
          <label>Name</label>
          <input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} />
          <label>Trusted contact (for "Maa ko bulao")</label>
          <div className="grid two">
            <input placeholder="Name" value={p.trustedContact?.name ?? ''} onChange={(e) => setProfile({ trustedContact: { name: e.target.value, phone: p.trustedContact?.phone ?? '' } })} />
            <input placeholder="Mobile" value={p.trustedContact?.phone ?? ''} onChange={(e) => setProfile({ trustedContact: { name: p.trustedContact?.name ?? 'Trusted contact', phone: e.target.value } })} />
          </div>
        </div>
        <div className="stack">
          <Toggle k="quiet" label="Quiet mode (shared home)" hint="Everything switches to text and captions; nothing is spoken aloud." />
          <Toggle k="wisprMode" label="Wispr Flow mode" hint="Uses a text box everywhere. Hold your Wispr Flow key and speak; Flow types into the box in any language." />
          <Toggle k="calm" label="Calm visuals" hint="Stops background animation. Good for low-end phones and sensory sensitivity." />
          <Toggle k="muted" label="Mute Dhriti's voice" hint="Dhriti still listens; replies appear as text." />
        </div>
        <div className="card stack">
          <h3>Your data</h3>
          <p className="muted">Stored only on this device: {data.screenings.length} screenings, {data.episodes.length} urge episodes, {data.diary.length} diary entries, {data.practice.length} practice sessions. Voice recordings are never saved.</p>
          <div className="row">
            <button className="btn" onClick={exportData}>Export my data (JSON)</button>
            <button className="btn danger" onClick={() => { if (confirm('Delete all Dhriti data on this device? This cannot be undone.')) reset(); }}>Delete everything</button>
          </div>
        </div>
        <div className="card stack">
          <h3>System status</h3>
          <p className="muted" style={{ margin: 0 }}>Server: {health ? 'connected' : 'not reachable (the agent runs on-device)'}</p>
          <p className="muted" style={{ margin: 0 }}>AI agent engine: {health?.model.configured ? `language model (${health.model.model}) + safety layer` : 'offline planner + hybrid NLP (rules + Naive Bayes)'}</p>
          <p className="muted" style={{ margin: 0 }}>Patient ID (for bookings): <code>{p.patientId.slice(0, 8)}…</code></p>
        </div>
      </div>
    </div>
  );
}
