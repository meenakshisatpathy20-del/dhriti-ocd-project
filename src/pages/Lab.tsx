import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { STUDY } from '../../shared/lab/study';
import { CHAT_TASKS, MULTI_TASKS, runLab, type LabReport } from '../../shared/lab/simulate';
import { gradeReply } from '../../shared/lab/grader';
import { COMPANION_PROMPT, partBPrompt, partCConversation, SUFFIX } from '../../shared/lab/raw';
import type { NaiveBayesModel } from '../../shared/ml/core';
import nbJson from '../../shared/ml/intent-nb.json';
import saved from '../../shared/lab/lab-results.json';
import { api, ApiError } from '../lib/api';
import { Checks, Copy, ReportView, frac, label, pct } from '../components/LabReport';

const nb = nbJson as unknown as NaiveBayesModel;
type Tab = 'overview' | 'new' | 'board' | 'dhriti' | 'quick';

interface RunSummary { id: string; name: string; method: string; model?: string; provider?: string; createdAt: string; summary: LabReport['summary'] }

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', example: 'gpt-4o-mini' },
  { id: 'gemini', name: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', example: 'gemini-2.0-flash' },
  { id: 'groq', name: 'Groq (free tier)', base: 'https://api.groq.com/openai/v1', example: 'llama-3.1-8b-instant' },
  { id: 'openrouter', name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', example: 'meta-llama/llama-3.1-8b-instruct' },
  { id: 'together', name: 'Together AI', base: 'https://api.together.xyz/v1', example: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { id: 'custom', name: 'Other OpenAI-compatible API', base: '', example: 'model-name' },
];

const METHOD: Record<string, string> = { api: 'API · raw', 'api+dhriti': 'API + Dhriti layer', manual: 'Manual', dhriti: 'Dhriti', study: 'Published study' };

// ---------------- New evaluation: API ----------------
function ApiEval() {
  const navigate = useNavigate();
  const [prov, setProv] = useState(PROVIDERS[2]);
  const [base, setBase] = useState(PROVIDERS[2].base);
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [both, setBoth] = useState(true);
  const [job, setJob] = useState<{ id: string; done: number; total: number } | null>(null);
  const [err, setErr] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = async () => {
    setErr('');
    try {
      const r = await api<{ jobId: string; total: number }>('/api/lab/evaluate', { method: 'POST', json: { baseUrl: base, apiKey: key, model, name, alsoDhriti: both } });
      setKey('');
      setJob({ id: r.jobId, done: 0, total: r.total });
      timer.current = window.setInterval(async () => {
        try {
          const j = await api<{ status: string; done: number; total: number; runIds: string[]; error?: string }>(`/api/lab/jobs/${r.jobId}`);
          setJob({ id: r.jobId, done: j.done, total: j.total });
          if (j.status === 'done') { window.clearInterval(timer.current); navigate(`/lab/runs/${j.runIds[0]}${j.runIds[1] ? `?compare=${j.runIds[1]}` : ''}`); }
          if (j.status === 'error') { window.clearInterval(timer.current); setJob(null); setErr(j.error ?? 'The evaluation failed'); }
        } catch (e) { window.clearInterval(timer.current); setJob(null); setErr((e as ApiError).message); }
      }, 2000);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  };

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>🤖 Test a model through its API</h2>
      <p className="muted" style={{ margin: 0 }}>Runs all 21 OCD-EVAL turns automatically with the study's exact prompt. Optionally runs the same model again behind Dhriti's safety layer, so you can see the difference.</p>
      {!job ? (
        <>
          <label>Provider</label>
          <div className="row">{PROVIDERS.map((p) => <button key={p.id} className={`chip ${prov.id === p.id ? 'on' : ''}`} onClick={() => { setProv(p); setBase(p.base); }}>{p.name}</button>)}</div>
          <div className="grid two">
            <div><label>Base URL</label><input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://…/v1" /></div>
            <div><label>Model</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder={`e.g. ${prov.example}`} /></div>
            <div><label>API key</label><input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Used for this run only, never stored" autoComplete="off" /></div>
            <div><label>Name on the leaderboard (optional)</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={model || 'e.g. My chatbot v2'} /></div>
          </div>
          <label className="toggle-line" style={{ justifyContent: 'flex-start' }}><input type="checkbox" checked={both} onChange={(e) => setBoth(e.target.checked)} /><span>Also test it behind Dhriti's safety layer (doubles the calls)</span></label>
          <div className="notice info">🔒 Your key is sent once over HTTPS, used for this run, and never saved or logged. Model replies and scores are saved publicly on the leaderboard. Cost: 22-43 short requests (usually a few cents, or free on Groq / Gemini free tiers).</div>
          {err && <div className="notice danger">{err}</div>}
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!base || !model || !key} onClick={start}>▶ Start evaluation</button>
        </>
      ) : (
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h3>Evaluating {name || model}…</h3>
          <div className="progress" style={{ width: '100%' }}><div style={{ width: `${(job.done / job.total) * 100}%` }} /></div>
          <p className="muted">{job.done} of {job.total} replies · keep this page open (about 1-3 minutes)</p>
        </div>
      )}
    </div>
  );
}

// ---------------- New evaluation: manual wizard ----------------
interface Draft { name: string; b: Record<string, string>; c: Record<string, string[]>; includeC: boolean }
const DRAFT_KEY = 'dhriti:lab-draft';
const steps = [
  ...CHAT_TASKS.map((t) => ({ kind: 'B' as const, task: t.id, turn: 0 })),
  ...MULTI_TASKS.flatMap((m) => [0, 1, 2, 3, 4].map((turn) => ({ kind: 'C' as const, task: m.id, turn }))),
];

function ManualEval() {
  const navigate = useNavigate();
  const [d, setD] = useState<Draft>(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '') as Draft; } catch { return { name: '', b: {}, c: {}, includeC: true }; }
  });
  const [i, setI] = useState(() => Math.min(Object.keys(d.b).length, 6));
  const [reply, setReply] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ } }, [d]);

  const lastStep = d.includeC ? steps.length : 6;
  const finished = i >= lastStep;
  const step = steps[i];

  const toSend = useMemo(() => {
    if (!step) return { full: '', fresh: '' };
    if (step.kind === 'B') { const t = CHAT_TASKS.find((x) => x.id === step.task)!; const p = partBPrompt(t.conversation); return { full: p, fresh: p }; }
    const m = MULTI_TASKS.find((x) => x.id === step.task)!;
    const base = CHAT_TASKS.find((t) => t.id === m.base_task)!;
    const pressure = m.pressure_turns.map((p) => p.text);
    const prev = d.c[m.id] ?? [];
    return { full: `${partCConversation(base.conversation, pressure, prev, step.turn)}${SUFFIX}`, fresh: step.turn === 0 ? partBPrompt(base.conversation) : pressure[step.turn - 1] };
  }, [step, d.c]);

  const checksFor = () => {
    if (!step) return null;
    if (step.kind === 'B') { const t = CHAT_TASKS.find((x) => x.id === step.task)!; return { checks: t.checks, id: t.id }; }
    const m = MULTI_TASKS.find((x) => x.id === step.task)!;
    const base = CHAT_TASKS.find((t) => t.id === m.base_task)!;
    return { checks: [...base.checks, ...(m.extra_checks?.[String(step.turn)] ?? [])], id: base.id };
  };
  const cf = checksFor();
  const preview = cf && reply.trim() ? gradeReply(cf.id, cf.checks, reply) : null;

  const next = () => {
    if (!step || !reply.trim()) return;
    if (step.kind === 'B') setD({ ...d, b: { ...d.b, [step.task]: reply } });
    else { const arr = [...(d.c[step.task] ?? [])]; arr[step.turn] = reply; setD({ ...d, c: { ...d.c, [step.task]: arr } }); }
    setReply('');
    setI(i + 1);
  };

  const submit = async () => {
    setSaving(true); setErr('');
    try {
      const partC = d.includeC ? d.c : {};
      const r = await api<{ id: string }>('/api/lab/runs', { method: 'POST', json: { name: d.name, submission: { partB: d.b, partC } } });
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/lab/runs/${r.id}`);
    } catch (e) { setErr((e as ApiError).message); setSaving(false); }
  };

  const reset = () => { if (confirm('Discard this evaluation and start again?')) { setD({ name: '', b: {}, c: {}, includeC: true }); setI(0); setReply(''); } };

  return (
    <div className="card stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>✍️ Evaluate any chatbot by copy-paste</h2>
        <button className="btn small ghost" onClick={reset}>Start over</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>Works with ChatGPT, Gemini, Copilot, a company's support bot, or your own app: no API key needed. Your progress is saved in this browser.</p>
      <div className="grid two">
        <div><label>Which AI are you testing?</label><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. ChatGPT (free), Nov 2026" /></div>
        <div><label>Scope</label>
          <div className="row">
            <button className={`chip ${!d.includeC ? 'on' : ''}`} onClick={() => setD({ ...d, includeC: false })}>Quick · 6 replies</button>
            <button className={`chip ${d.includeC ? 'on' : ''}`} onClick={() => setD({ ...d, includeC: true })}>Full · 21 replies (with pressure test)</button>
          </div>
        </div>
      </div>
      <div className="progress"><div style={{ width: `${(Math.min(i, lastStep) / lastStep) * 100}%` }} /></div>
      <small className="muted">Step {Math.min(i + 1, lastStep)} of {lastStep}</small>

      {i === 0 && <div className="notice info"><b>First, paste this as the system prompt</b> (or as the first message, saying "From now on, act as this"): <i>{COMPANION_PROMPT}</i> <Copy text={COMPANION_PROMPT} label="Copy prompt" /><br /><small>For each OCD-EVAL scenario, start a <b>new chat</b>. In the pressure test, stay in the same chat and send only the new message.</small></div>}

      {!finished && step && (
        <div className="grid two">
          <div className="stack">
            <span className={`badge ${step.kind === 'B' ? (step.task.includes('control') ? 'warn' : 'info') : 'danger'}`} style={{ alignSelf: 'flex-start' }}>
              {step.kind === 'B' ? `Part B · ${label(step.task)}` : `Part C · ${label(step.task)} · turn ${step.turn}${step.turn ? ` (${MULTI_TASKS.find((m) => m.id === step.task)!.pressure_turns[step.turn - 1].tactic.replace(/_/g, ' ')})` : ''}`}
            </span>
            <small className="muted">{step.kind === 'B' || step.turn === 0 ? 'Start a new chat and send:' : 'In the same chat, send:'}</small>
            <pre className="convo">{toSend.fresh}</pre>
            <div className="row"><Copy text={toSend.fresh} label="Copy message" />{step.kind === 'C' && step.turn > 0 && <Copy text={toSend.full} label="Copy full conversation" />}</div>
          </div>
          <div className="stack">
            <small className="muted">Paste the AI's reply:</small>
            <textarea rows={9} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the reply here…" />
            {preview && cf && <Checks checks={preview} defs={cf.checks} />}
            <div className="row">
              {i > 0 && <button className="btn ghost" onClick={() => { setI(i - 1); setReply(''); }}>← Back</button>}
              <button className="btn primary" disabled={!reply.trim()} onClick={next}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {finished && (
        <div className="stack" style={{ alignItems: 'flex-start' }}>
          <h3 style={{ margin: 0 }}>All replies collected 🎉</h3>
          <p className="muted" style={{ margin: 0 }}>Submit to grade them on the server and add the result to the leaderboard.</p>
          {err && <div className="notice danger">{err}</div>}
          <button className="btn primary" disabled={saving} onClick={submit}>{saving ? 'Grading…' : 'Grade and publish'}</button>
        </div>
      )}
    </div>
  );
}

// ---------------- Leaderboard ----------------
function Leaderboard() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<RunSummary[]>('/api/lab/runs').then(setRuns).catch((e: ApiError) => setErr(e.message)); }, []);

  const rows = useMemo(() => {
    const study = STUDY.partB.map((b) => {
      const c = STUDY.partC.find((x) => x.model === b.model);
      return { key: `study-${b.model}`, name: b.model, method: 'study', ocd: b.ocd, controls: b.controls, turns: c?.turnsHeld ?? null, date: '2026-11-08', link: STUDY.url, external: true };
    });
    const mine = (runs ?? []).map((r) => ({ key: r.id, name: r.name, method: r.method, ocd: frac(r.summary.ocdPass), controls: frac(r.summary.controlPass), turns: r.summary.conversationsHeld?.endsWith('/0') ? null : r.summary.meanTurnsHeld, date: r.createdAt.slice(0, 10), link: `/lab/runs/${r.id}`, external: false }));
    const own = saved as unknown as LabReport;
    const dhritiRow = { key: 'dhriti-agent', name: 'Dhriti on-device agent', method: 'dhriti', ocd: frac(own.summary.ocdPass), controls: frac(own.summary.controlPass), turns: own.summary.meanTurnsHeld, date: own.ranAt.slice(0, 10), link: '#dhriti', external: false };
    return [...mine, dhritiRow, ...study].sort((a, b) => b.ocd - a.ocd || (b.turns ?? -1) - (a.turns ?? -1) || b.controls - a.controls);
  }, [runs]);

  return (
    <div className="card stack">
      <div className="spread"><h2 style={{ margin: 0 }}>🏆 Leaderboard</h2><small className="muted">Higher is better on every column</small></div>
      {err && <div className="notice">Could not load saved runs ({err}). Showing the published study only.</div>}
      <table>
        <thead><tr><th>#</th><th>AI system</th><th>How</th><th>OCD chats passed</th><th>Controls passed</th><th>Turns held (of 5)</th><th>Date</th><th /></tr></thead>
        <tbody>
          {rows.map((r, n) => (
            <tr key={r.key}>
              <td>{n + 1}</td>
              <td><b>{r.name}</b></td>
              <td><span className={`badge ${r.method === 'study' ? 'warn' : r.method === 'api+dhriti' || r.method === 'dhriti' ? 'ok' : 'info'}`}>{METHOD[r.method] ?? r.method}</span></td>
              <td className={r.ocd < 1 ? 'bad' : ''}>{pct(r.ocd)}</td>
              <td className={r.controls < 1 ? 'bad' : ''}>{pct(r.controls)}</td>
              <td className={r.turns !== null && r.turns < 3 ? 'bad' : ''}>{r.turns === null ? '–' : r.turns}</td>
              <td className="muted">{r.date}</td>
              <td>{r.external ? <a href={r.link} target="_blank" rel="noreferrer">source</a> : r.link === '#dhriti' ? <span className="faint">see ⭐ tab</span> : <Link to={r.link}>report →</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small className="faint">"Published study" rows come from OCD-EVAL (3 trials per task, graded by an LLM judge with 130/130 agreement). Lab rows are single runs graded by Dhriti's offline grader (65/65 agreement with the study's hand labels). Compare with care.</small>
    </div>
  );
}

// ---------------- Quick check (single reply) ----------------
function QuickCheck() {
  const [taskId, setTaskId] = useState(CHAT_TASKS[0].id);
  const [reply, setReply] = useState('');
  const task = CHAT_TASKS.find((t) => t.id === taskId)!;
  const result = useMemo(() => (reply.trim() ? gradeReply(task.id, task.checks, reply) : null), [reply, task]);
  return (
    <div className="stack">
      <div className="row">{CHAT_TASKS.map((t) => <button key={t.id} className={`chip ${t.id === taskId ? 'on' : ''}`} onClick={() => { setTaskId(t.id); setReply(''); }}>{t.id.slice(0, 3)} · {label(t.id)}</button>)}</div>
      <div className="grid two">
        <div className="card stack">
          <div className="spread"><h3 style={{ margin: 0 }}>The scenario</h3><span className={`badge ${task.id.includes('control') ? 'warn' : 'info'}`}>{task.id.includes('control') ? 'control: helping is correct' : 'OCD: must hold the plan'}</span></div>
          <pre className="convo">{partBPrompt(task.conversation)}</pre>
          <div className="row"><Copy text={COMPANION_PROMPT} label="Copy system prompt" /><Copy text={partBPrompt(task.conversation)} label="Copy conversation" /></div>
          <small className="faint">Why it is hard: {task.why_hard}</small>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Paste a reply</h3>
          <textarea rows={9} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste any AI's reply…" />
          {result && <><span className={`badge ${result.every((c) => c.passed) ? 'ok' : 'danger'}`} style={{ alignSelf: 'flex-start' }}>{result.every((c) => c.passed) ? '✓ Pass' : '✗ Fail'}</span><Checks checks={result} defs={task.checks} /></>}
        </div>
      </div>
    </div>
  );
}

/** Safety Lab: an evaluation platform built on the OCD-EVAL benchmark. */
export default function Lab() {
  const [tab, setTab] = useState<Tab>('overview');
  const [report, setReport] = useState<LabReport>(saved as unknown as LabReport);
  const [running, setRunning] = useState(false);

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Safety Lab · built on our OCD-EVAL research</div>
        <h1>Does an AI treat people with OCD the way a specialist would? 🧪</h1>
        <p className="muted">An open evaluation lab: test any AI model or chatbot on realistic OCD conversations and their paired controls, get a graded report, and compare it on the leaderboard.</p>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {([['overview', '📖 How it works'], ['new', '➕ New evaluation'], ['board', '🏆 Leaderboard'], ['dhriti', '⭐ Dhriti'], ['quick', '⚡ Quick check']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="stack">
          <div className="card hero-card">
            <h2>The question</h2>
            <p>{STUDY.headline}</p>
            <div className="grid three">
              <div className="card tight"><h3>Part A · Knowing</h3><p className="muted" style={{ margin: 0 }}>Clinical triage of 10 interviews (in the original study).</p></div>
              <div className="card tight"><h3>Part B · Doing</h3><p className="muted" style={{ margin: 0 }}>6 companion-app chats: 3 where the user's ERP plan says "don't reassure me", and 3 paired controls where helping is correct.</p></div>
              <div className="card tight"><h3>Part C · Pressure</h3><p className="muted" style={{ margin: 0 }}>Each OCD chat continues for 4 turns: a "fact", a bargain, guilt, then asking someone else.</p></div>
            </div>
          </div>
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Content vs. function</h3>
            <p style={{ margin: 0 }}>Every OCD scenario has a control with the same frightening words and the opposite right answer: a mother's intrusive knife image (hold the ERP plan) vs. a parent who shook a baby (call an ambulance); fear of bin germs (no reassurance) vs. a deep cut from a rusty bin (tetanus advice); a blasphemous thought (no confession ritual) vs. a flu-and-Mass question (answer it). A system that reacts to words instead of meaning fails one side.</p>
          </div>
          <div className="grid two">
            <div className="card stack"><h3 style={{ margin: 0 }}>Who is this for?</h3><ul style={{ margin: 0 }}><li>Teams building mental-health chatbots</li><li>Therapists deciding whether to recommend an app</li><li>Researchers comparing AI safety behaviour</li><li>Students learning how ERP-consistent replies look</li></ul></div>
            <div className="card stack"><h3 style={{ margin: 0 }}>Three ways to use it</h3><ol style={{ margin: 0 }}><li><b>API:</b> connect any OpenAI-compatible model with your key.</li><li><b>Copy-paste:</b> a guided wizard for any chatbot, no key needed.</li><li><b>Quick check:</b> grade a single reply instantly.</li></ol><button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => setTab('new')}>Start an evaluation →</button></div>
          </div>
          <h2>What the study found, and how it shaped Dhriti</h2>
          <div className="grid two">
            {STUDY.lessons.map((l) => (
              <div key={l.finding} className="card tight"><p style={{ margin: 0 }}><b>Finding:</b> {l.finding}</p><p className="muted" style={{ margin: '6px 0 0' }}><b>In Dhriti:</b> {l.inDhriti}</p></div>
            ))}
          </div>
          <small className="faint">Scenarios © OCD-EVAL (<a href={STUDY.url} target="_blank" rel="noreferrer">source</a>). Synthetic cases for research and education; not a screening or diagnostic tool. Do not paste real patients' messages.</small>
        </div>
      )}

      {tab === 'new' && <div className="stack"><ApiEval /><ManualEval /></div>}
      {tab === 'board' && <Leaderboard />}
      {tab === 'quick' && <QuickCheck />}

      {tab === 'dhriti' && (
        <div className="stack">
          <div className="spread">
            <small className="muted">Dhriti's own on-device agent · last run {new Date(report.ranAt).toLocaleString()}</small>
            <button className="btn primary" disabled={running} onClick={async () => { setRunning(true); setReport(await runLab({ nb, model: null })); setRunning(false); }}>{running ? 'Running…' : '▶ Run again in your browser'}</button>
          </div>
          <ReportView report={report} name="dhriti" />
          <div className="notice info">Honest reading: Dhriti was designed using these findings and is graded here by the offline grader, so this shows it behaves as designed; it is not a blind benchmark. The failed control (a general religious question) reflects that the on-device agent has no general knowledge.</div>
        </div>
      )}
    </div>
  );
}
