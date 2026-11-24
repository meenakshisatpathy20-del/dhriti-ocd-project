import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';

interface Row { id: string; name: string; role: string; council: string; registrationNumber: string; registrationYear: number; qualification: string; institution: string; experienceYears: number; city: string; status: string; email: string; phone: string; hasDocument: boolean; demo?: boolean; reviewNote?: string }

const KEY = 'dhriti:admin-token';

/** Human-in-the-loop KYC review: every professional is checked against the public register before approval. */
export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(KEY) ?? '');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const headers = { 'x-admin-token': token };

  const load = () => {
    if (!token) return;
    api<Row[]>('/api/admin/professionals', { headers }).then((r) => { setRows(r); setError(''); }).catch((e: ApiError) => setError(e.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const review = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await api(`/api/admin/professionals/${id}/review`, { method: 'POST', headers, json: { status, note: notes[id] } });
      load();
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  const viewDoc = async (id: string) => {
    const res = await fetch(`/api/admin/professionals/${id}/document`, { headers });
    if (!res.ok) return setError('No document available');
    window.open(URL.createObjectURL(await res.blob()), '_blank');
  };

  if (!token || error === 'Admin token required') {
    return (
      <div style={{ maxWidth: 480 }}>
        <div className="page-head"><div className="kicker">Admin</div><h1>Verification console</h1></div>
        <div className="card stack">
          <label>Admin token</label>
          <input type="password" onKeyDown={(e) => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value; sessionStorage.setItem(KEY, v); setToken(v); setError(''); } }} />
          <small className="muted">Set ADMIN_TOKEN in .env (default for local demo: dhriti-admin). Press Enter.</small>
          {error && <div className="field-error">{error}</div>}
        </div>
      </div>
    );
  }

  const pending = rows.filter((r) => r.status === 'pending');
  return (
    <div>
      <div className="page-head"><div className="kicker">Admin</div><h1>Professional verification</h1>
        <p className="muted">Check each registration number on the NMC Indian Medical Register, the State Medical Council site, or the RCI Central Rehabilitation Register before approving.</p>
      </div>
      {error && <div className="notice danger">{error}</div>}
      <h2>Pending ({pending.length})</h2>
      <div className="grid two">
        {pending.map((r) => (
          <div key={r.id} className="card stack">
            <div className="spread"><h3 style={{ margin: 0 }}>{r.name}</h3><span className="badge warn">pending</span></div>
            <table><tbody>
              <tr><th>Role</th><td>{r.role}</td></tr>
              <tr><th>Council</th><td>{r.council}</td></tr>
              <tr><th>Reg. no / year</th><td>{r.registrationNumber} / {r.registrationYear}</td></tr>
              <tr><th>Qualification</th><td>{r.qualification}, {r.institution}</td></tr>
              <tr><th>Experience</th><td>{r.experienceYears} yrs · {r.city}</td></tr>
              <tr><th>Contact</th><td>{r.email} · {r.phone}</td></tr>
            </tbody></table>
            {r.hasDocument ? <button className="btn small" onClick={() => viewDoc(r.id)}>View certificate</button> : <small className="faint">No document (demo)</small>}
            <input placeholder="Reviewer note (required to reject)" value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <div className="row">
              <button className="btn primary small" onClick={() => review(r.id, 'verified')}>Verify</button>
              <button className="btn danger small" onClick={() => review(r.id, 'rejected')}>Reject</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="faint">Nothing waiting.</p>}
      </div>
      <h2 style={{ marginTop: 24 }}>All professionals</h2>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Council</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.role}</td><td>{r.council}</td><td><span className={`badge ${r.status === 'verified' ? 'ok' : r.status === 'rejected' ? 'danger' : 'warn'}`}>{r.status}</span></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
