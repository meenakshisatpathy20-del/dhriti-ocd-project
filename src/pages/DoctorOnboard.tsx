import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COUNCILS, LANGUAGES, QUALIFICATIONS, SPECIALISATIONS, validateKyc, type KycApplication, type ProfessionalRole } from '../../shared/clinical/kyc';
import { ApiError } from '../lib/api';

const EMPTY: Partial<KycApplication> = { role: 'psychiatrist', specialisations: [], languages: [], modes: ['online'], consentToVerify: false };

/** Professional onboarding with KYC: registration, qualification, specialisation and certificate upload. */
export default function DoctorOnboard() {
  const [a, setA] = useState<Partial<KycApplication>>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<{ id: string; accessKey: string } | null>(null);
  const issues = useMemo(() => validateKyc(a, !!file), [a, file]);
  const err = (f: string) => touched && issues.find((i) => i.field === f)?.message;
  const set = <K extends keyof KycApplication>(k: K, v: KycApplication[K]) => setA((x) => ({ ...x, [k]: v }));
  const toggle = (k: 'specialisations' | 'languages' | 'modes', v: string) => setA((x) => {
    const cur = (x[k] as string[]) ?? [];
    return { ...x, [k]: cur.includes(v) ? cur.filter((c) => c !== v) : [...cur, v] };
  });

  const submit = async () => {
    setTouched(true);
    setServerError('');
    if (issues.length) return;
    const fd = new FormData();
    fd.append('application', JSON.stringify(a));
    fd.append('document', file!);
    try {
      const res = await fetch('/api/professionals', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) throw new ApiError(body.error, res.status, body);
      setResult(body);
    } catch (e) {
      setServerError((e as ApiError).message);
    }
  };

  if (result) {
    return (
      <div className="card stack" style={{ maxWidth: 640 }}>
        <h1>Application received</h1>
        <p>Our team will verify your registration against the public council register. This usually takes 1-2 working days.</p>
        <div className="notice">Save your access key now. It is shown only once and lets you sign in to the professional portal.</div>
        <code style={{ fontSize: '1.1rem', padding: 12, background: '#f3e9ff', borderRadius: 10, wordBreak: 'break-all' }}>{result.accessKey}</code>
        <Link className="btn primary" to="/pro">Go to professional portal</Link>
      </div>
    );
  }

  const role = a.role as ProfessionalRole;
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="kicker">For professionals</div>
        <h1>Join Dhriti as a verified professional</h1>
        <p className="muted">We verify every professional (KYC) before patients can see them. Psychiatrists: NMC or State Medical Council registration. Clinical psychologists: RCI registration.</p>
      </div>
      <div className="card">
        <h3>Identity</h3>
        <div className="grid two">
          <div><label>Full name (as on register)</label><input value={a.name ?? ''} onChange={(e) => set('name', e.target.value)} />{err('name') && <div className="field-error">{err('name')}</div>}</div>
          <div><label>Role</label>
            <select value={role} onChange={(e) => setA((x) => ({ ...x, role: e.target.value as ProfessionalRole, council: undefined, qualification: undefined }))}>
              <option value="psychiatrist">Psychiatrist</option>
              <option value="clinical_psychologist">Clinical psychologist (RCI)</option>
              <option value="counsellor">Counsellor</option>
            </select>
          </div>
          <div><label>Email</label><input type="email" value={a.email ?? ''} onChange={(e) => set('email', e.target.value)} />{err('email') && <div className="field-error">{err('email')}</div>}</div>
          <div><label>Mobile</label><input value={a.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98xxxxxxxx" />{err('phone') && <div className="field-error">{err('phone')}</div>}</div>
        </div>
      </div>
      <div className="card">
        <h3>Registration & licence</h3>
        <div className="grid two">
          <div><label>Council</label>
            <select value={a.council ?? ''} onChange={(e) => set('council', e.target.value)}>
              <option value="">Choose…</option>
              {COUNCILS[role].map((c) => <option key={c}>{c}</option>)}
            </select>{err('council') && <div className="field-error">{err('council')}</div>}
          </div>
          <div><label>Registration number</label><input value={a.registrationNumber ?? ''} onChange={(e) => set('registrationNumber', e.target.value)} placeholder={role === 'clinical_psychologist' ? 'A12345' : 'e.g. KMC-45821'} />{err('registrationNumber') && <div className="field-error">{err('registrationNumber')}</div>}</div>
          <div><label>Year of registration</label><input type="number" value={a.registrationYear ?? ''} onChange={(e) => set('registrationYear', Number(e.target.value))} />{err('registrationYear') && <div className="field-error">{err('registrationYear')}</div>}</div>
          <div><label>Registration certificate (PDF/JPG/PNG, max 5 MB)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{err('document') && <div className="field-error">{err('document')}</div>}</div>
        </div>
      </div>
      <div className="card">
        <h3>Education & practice</h3>
        <div className="grid two">
          <div><label>Qualification</label>
            <select value={a.qualification ?? ''} onChange={(e) => set('qualification', e.target.value)}>
              <option value="">Choose…</option>
              {QUALIFICATIONS[role].map((q) => <option key={q}>{q}</option>)}
            </select>{err('qualification') && <div className="field-error">{err('qualification')}</div>}
          </div>
          <div><label>Institution</label><input value={a.institution ?? ''} onChange={(e) => set('institution', e.target.value)} />{err('institution') && <div className="field-error">{err('institution')}</div>}</div>
          <div><label>Years of experience</label><input type="number" value={a.experienceYears ?? ''} onChange={(e) => set('experienceYears', Number(e.target.value))} />{err('experienceYears') && <div className="field-error">{err('experienceYears')}</div>}</div>
          <div><label>City</label><input value={a.city ?? ''} onChange={(e) => set('city', e.target.value)} />{err('city') && <div className="field-error">{err('city')}</div>}</div>
          <div><label>Fee per session (₹)</label><input type="number" value={a.feeInr ?? ''} onChange={(e) => set('feeInr', Number(e.target.value))} />{err('feeInr') && <div className="field-error">{err('feeInr')}</div>}</div>
        </div>
        <label>Specialisations</label>
        <div className="row">{SPECIALISATIONS.map((s) => <button key={s} type="button" className={`chip ${a.specialisations?.includes(s) ? 'on' : ''}`} onClick={() => toggle('specialisations', s)}>{s}</button>)}</div>
        {err('specialisations') && <div className="field-error">{err('specialisations')}</div>}
        <label>Languages you consult in</label>
        <div className="row">{LANGUAGES.map((s) => <button key={s} type="button" className={`chip ${a.languages?.includes(s) ? 'on' : ''}`} onClick={() => toggle('languages', s)}>{s}</button>)}</div>
        {err('languages') && <div className="field-error">{err('languages')}</div>}
        <label>Session modes</label>
        <div className="row">{['online', 'offline'].map((s) => <button key={s} type="button" className={`chip ${a.modes?.includes(s as 'online') ? 'on' : ''}`} onClick={() => toggle('modes', s)}>{s}</button>)}</div>
        <label>Short bio</label>
        <textarea rows={3} value={a.bio ?? ''} onChange={(e) => set('bio', e.target.value)} />
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 18, height: 18 }} checked={!!a.consentToVerify} onChange={(e) => set('consentToVerify', e.target.checked)} />
          <span>I consent to Dhriti verifying my registration with the council's public register.</span>
        </label>
        {err('consentToVerify') && <div className="field-error">{err('consentToVerify')}</div>}
        <div className="spread" style={{ marginTop: 16 }}>
          <small className="muted">{touched && issues.length ? `${issues.length} field(s) need attention` : 'All information is reviewed by a human before approval.'}</small>
          <button className="btn primary" onClick={submit}>Submit for verification</button>
        </div>
        {serverError && <div className="field-error">{serverError}</div>}
      </div>
    </div>
  );
}
