import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

interface Booking { id: string; patientAlias: string; slot: string; mode: string; status: string; carePlan?: { text: string; at: string }; sharedReport?: Record<string, unknown> & { ybocsSeries?: { total: number; band: string }[]; outcomes?: Record<string, number>; reassurance14?: number; careLabel?: string; episodes14?: number; topCompulsions?: [string, number][] } }
interface Msg { id: string; from: string; text: string; urgent?: boolean }

const KEY = 'dhriti:pro-key';

/** Professional portal: verification status, bookings, consented patient reports, chat. */
export default function DoctorPortal() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY) ?? '');
  const [input, setInput] = useState('');
  const [me, setMe] = useState<{ profile: { name: string; status: string; reviewNote?: string; slots: string[] }; bookings: Booking[] } | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const [plans, setPlans] = useState<Record<string, string>>({});
  const headers = { 'x-pro-key': key };

  const load = () => {
    if (!key) return;
    api<typeof me>('/api/professionals/me', { headers }).then((m) => { setMe(m); setError(''); }).catch((e: ApiError) => { setError(e.message); setMe(null); });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [key]);
  useEffect(() => {
    if (!open) return;
    const pull = () => api<Msg[]>(`/api/bookings/${open}/messages`, { headers }).then(setMsgs).catch(() => undefined);
    pull();
    const t = setInterval(pull, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!key || (!me && error)) {
    return (
      <div style={{ maxWidth: 560 }}>
        <div className="page-head"><div className="kicker">Professional portal</div><h1>Sign in</h1></div>
        <div className="card stack">
          <label>Access key (shown once when you applied)</label>
          <input value={input} onChange={(e) => setInput(e.target.value)} />
          {error && <div className="field-error">{error}</div>}
          <button className="btn primary" onClick={() => { localStorage.setItem(KEY, input.trim()); setKey(input.trim()); }}>Sign in</button>
          <p className="muted">New here? <Link to="/pro/join">Apply to join Dhriti</Link>. Reviewer? <Link to="/admin">Admin verification</Link>.</p>
        </div>
      </div>
    );
  }
  if (!me) return <div className="card">Loading…</div>;

  const status = me.profile.status;
  return (
    <div>
      <div className="page-head spread">
        <div><div className="kicker">Professional portal</div><h1>{me.profile.name}</h1></div>
        <div className="row">
          <span className={`badge ${status === 'verified' ? 'ok' : status === 'rejected' ? 'danger' : 'warn'}`}>{status}</span>
          <button className="btn small ghost" onClick={() => { localStorage.removeItem(KEY); setKey(''); setMe(null); }}>Sign out</button>
        </div>
      </div>
      {status === 'pending' && <div className="notice">Your registration is being verified. You will appear to patients once approved.</div>}
      {status === 'rejected' && <div className="notice danger">Application not approved: {me.profile.reviewNote}</div>}
      {status === 'verified' && me.profile.slots.length === 0 && <button className="btn" onClick={async () => { await api('/api/professionals/me/slots', { method: 'POST', headers, json: {} }); load(); }}>Open default slots for the next 5 days</button>}

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card stack">
          <h3>Bookings ({me.bookings.length})</h3>
          {me.bookings.length === 0 && <p className="faint">No bookings yet.</p>}
          {me.bookings.map((b) => (
            <div key={b.id} className="card tight stack">
              <div className="spread"><b>{b.patientAlias}</b><span className="badge info">{b.status}</span></div>
              <small className="muted">{new Date(b.slot).toLocaleString()} · {b.mode}</small>
              <div className="row">
                {b.status === 'requested' && <button className="btn small primary" onClick={async () => { await api(`/api/bookings/${b.id}/status`, { method: 'POST', headers, json: { status: 'confirmed' } }); load(); }}>Confirm</button>}
                {b.status === 'confirmed' && <button className="btn small" onClick={async () => { await api(`/api/bookings/${b.id}/status`, { method: 'POST', headers, json: { status: 'completed' } }); load(); }}>Mark completed</button>}
                <button className="btn small" onClick={() => setOpen(b.id)}>Chat</button>
              </div>
              {b.sharedReport ? (
                <div className="notice info">
                  <b>Shared report</b> · care: {String(b.sharedReport.careLabel)} · Y-BOCS: {b.sharedReport.ybocsSeries?.map((y) => y.total).join(' → ') || 'n/a'} · urges (14d): {String(b.sharedReport.episodes14)} · resisted/delayed/did: {b.sharedReport.outcomes ? `${b.sharedReport.outcomes.resisted}/${b.sharedReport.outcomes.delayed}/${b.sharedReport.outcomes.did}` : 'n/a'} · reassurance asks: {String(b.sharedReport.reassurance14)}
                </div>
              ) : <small className="faint">Patient has not shared a report.</small>}
              <label style={{ margin: '4px 0 0' }}>ERP plan for this patient (Dhriti will repeat it during urges)</label>
              <textarea rows={2} value={plans[b.id] ?? b.carePlan?.text ?? ''} placeholder='e.g. "After touching the bin: no washing or gel for one hour. If you ask whether it is safe, I will not answer."' onChange={(e) => setPlans({ ...plans, [b.id]: e.target.value })} />
              <div className="row">
                <button className="btn small" onClick={async () => { await api(`/api/bookings/${b.id}/plan`, { method: 'POST', headers, json: { text: plans[b.id] ?? b.carePlan?.text ?? '' } }); load(); }}>Save plan</button>
                {b.carePlan && <small className="faint">Saved {new Date(b.carePlan.at).toLocaleDateString()}</small>}
              </div>
            </div>
          ))}
        </div>
        <div className="card stack">
          <h3>{open ? 'Chat' : 'Select a booking to chat'}</h3>
          {open && (
            <>
              <div className="chat">{msgs.map((m) => <div key={m.id} className={`bubble ${m.from === 'professional' ? 'user' : 'assistant'}`}>{m.urgent && <span className="badge danger" style={{ marginBottom: 6 }}>⚠ possible risk: follow up now</span>}<div>{m.text}</div></div>)}</div>
              <div className="row">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply (works with Wispr Flow dictation)" style={{ flex: 1 }} />
                <button className="btn primary" onClick={async () => { if (!reply.trim()) return; await api(`/api/bookings/${open}/messages`, { method: 'POST', headers, json: { text: reply } }); setReply(''); setMsgs(await api<Msg[]>(`/api/bookings/${open}/messages`, { headers })); }}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
