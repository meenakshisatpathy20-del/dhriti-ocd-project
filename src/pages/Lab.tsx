import { useEffect, useMemo, useState } from 'react';
import { STUDY } from '../../shared/lab/study';
import { CHAT_TASKS, MULTI_TASKS, runLab, type LabReport, type TurnResult } from '../../shared/lab/simulate';
import { gradeReply, type Check, type CheckResult } from '../../shared/lab/grader';
import { COMPANION_PROMPT, partBPrompt, partCConversation, SUFFIX, toCsv, toOcdEvalTranscripts } from '../../shared/lab/raw';
import type { NaiveBayesModel } from '../../shared/ml/core';
import nbJson from '../../shared/ml/intent-nb.json';
import saved from '../../shared/lab/lab-results.json';
import { api, ApiError } from '../lib/api';

const nb = nbJson as unknown as NaiveBayesModel;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const label = (id: string) => id.replace(/^[CM]\d+_/, '').replace(/_/g, ' ');
type Tab = 'study' | 'dhriti' | 'grade' | 'pressure' | 'model';

function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}

function Checks({ checks, defs }: { checks: CheckResult[]; defs?: Check[] }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 6 }}>
        {checks.map((c) => (
          <span key={c.id} className={`badge ${c.passed ? 'ok' : 'danger'}`} title={defs?.find((d) => d.id === c.id)?.text}>
            {c.passed ? '✓' : '✗'} {c.kind === 'must_not' ? 'no ' : ''}{c.id.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
      {defs && checks.filter((c) => !c.passed).map((c) => (
        <small key={c.id} className="bad">✗ <b>{c.id.replace(/_/g, ' ')}</b>: {defs.find((d) => d.id === c.id)?.text}</small>
      ))}
    </div>
  );
}

function Copy({ text, label: l = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button className="btn small" onClick={async () => { await navigator.clipboard.writeText(text).catch(() => undefined); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? 'Copied ✓' : l}</button>;
}

function ReportView({ report, name }: { report: LabReport; name: string }) {
  const [part, setPart] = useState<'B' | 'C'>('B');
  return (
    <div className="stack">
      <div className="grid four keep">
        <div className="stat"><span className="v">{report.summary.ocdPass}</span><span className="l">OCD conversations passed</span></div>
        <div className="stat"><span className="v">{report.summary.controlPass}</span><span className="l">paired controls passed</span></div>
        <div className="stat"><span className="v">{report.summary.meanTurnsHeld}/5</span><span className="l">mean turns held under pressure</span></div>
        <div className="stat"><span className="v">{pct(report.grader.agreement)}</span><span className="l">grader agreement ({report.grader.items} labels)</span></div>
      </div>
      <div className="row">
        <button className={`chip ${part === 'B' ? 'on' : ''}`} onClick={() => setPart('B')}>Part B · single reply</button>
        <button className={`chip ${part === 'C' ? 'on' : ''}`} onClick={() => setPart('C')}>Part C · five turns of pressure</button>
        <span style={{ flex: 1 }} />
        <button className="btn small" onClick={() => download(`ocd-eval-${name}.json`, JSON.stringify(toOcdEvalTranscripts(report, 'dhriti-lab', name), null, 2))}>⬇ Transcripts (OCD-EVAL format)</button>
        <button className="btn small" onClick={() => download(`ocd-eval-${name}.csv`, toCsv(report), 'text/csv')}>⬇ CSV</button>
      </div>
      {part === 'B' && (
        <div className="grid two">
          {report.partB.map((b) => (
            <div key={b.task} className="card stack">
              <div className="spread">
                <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{label(b.task)}</h3>
                <span className={`badge ${b.turn.passed ? 'ok' : 'danger'}`}>{b.isControl ? 'control · ' : 'OCD · '}{b.turn.passed ? 'pass' : 'fail'}</span>
              </div>
              <small className="muted">{b.why}</small>
              <div className="bubble user">{b.turn.user}</div>
              <div className="bubble assistant">{b.turn.reply}</div>
              <Checks checks={b.turn.checks} />
            </div>
          ))}
        </div>
      )}
      {part === 'C' && report.partC.map((c) => (
        <div key={c.task} className="card stack">
          <div className="spread">
            <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{label(c.task)}</h3>
            <span className={`badge ${c.firstBreak === null ? 'ok' : 'danger'}`}>held {c.turnsHeld}/5</span>
          </div>
          <div className="turn-meter">{c.turns.map((t) => <span key={t.turn} className={t.passed ? 'ok' : 'bad'} title={t.tactic} />)}</div>
          {c.turns.map((t) => (
            <details key={t.turn}>
              <summary>Turn {t.turn} · {t.tactic.replace(/_/g, ' ')} · {t.passed ? '✓ held' : '✗ broke'}</summary>
              <div className="stack" style={{ marginTop: 8 }}>
                <div className="bubble user">{t.user}</div>
                <div className="bubble assistant">{t.reply}</div>
                <Checks checks={t.checks} />
              </div>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Part B: paste any chatbot's reply and grade it. */
function GradeAny() {
  const [taskId, setTaskId] = useState(CHAT_TASKS[0].id);
  const [reply, setReply] = useState('');
  const task = CHAT_TASKS.find((t) => t.id === taskId)!;
  const result = useMemo(() => (reply.trim() ? gradeReply(task.id, task.checks, reply) : null), [reply, task]);
  return (
    <div className="stack">
      <div className="notice info">Test <b>any</b> AI chatbot (ChatGPT, Gemini, your own app). Copy the system prompt and the conversation into it, paste its reply below, and see how it treats a person with OCD. Nothing is sent anywhere.</div>
      <div className="row">{CHAT_TASKS.map((t) => <button key={t.id} className={`chip ${t.id === taskId ? 'on' : ''}`} onClick={() => { setTaskId(t.id); setReply(''); }}>{t.id.slice(0, 3)} · {label(t.id)}</button>)}</div>
      <div className="grid two">
        <div className="card stack">
          <div className="spread"><h3 style={{ margin: 0 }}>1 · Give the chatbot this</h3><span className={`badge ${task.id.includes('control') ? 'warn' : 'info'}`}>{task.id.includes('control') ? 'control: helping is correct' : 'OCD: must hold the plan'}</span></div>
          <small className="muted"><b>System prompt</b> (or paste first):</small>
          <div className="bubble assistant" style={{ maxWidth: '100%', fontSize: '0.9rem' }}>{COMPANION_PROMPT}</div>
          <Copy text={COMPANION_PROMPT} label="Copy system prompt" />
          <small className="muted"><b>Conversation</b>:</small>
          <pre className="convo">{partBPrompt(task.conversation)}</pre>
          <Copy text={partBPrompt(task.conversation)} label="Copy conversation" />
          <small className="faint">Why it is hard: {task.why_hard}</small>
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>2 · Paste its reply</h3>
          <textarea rows={9} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the chatbot's reply here…" />
          {result && (
            <>
              <span className={`badge ${result.every((c) => c.passed) ? 'ok' : 'danger'}`} style={{ alignSelf: 'flex-start', fontSize: '0.95rem' }}>{result.every((c) => c.passed) ? '✓ Pass: consistent with ERP' : '✗ Fail'}</span>
              <Checks checks={result} defs={task.checks} />
            </>
          )}
          <small className="faint">Graded by Dhriti's offline grader (100% agreement with OCD-EVAL's hand labels). For publication-grade results, export and re-grade with the study's LLM judge.</small>
        </div>
      </div>
    </div>
  );
}

/** Part C: run the five-turn pressure test against any chatbot by copy-paste. */
function PressureTest() {
  const [mid, setMid] = useState(MULTI_TASKS[0].id);
  const m = MULTI_TASKS.find((x) => x.id === mid)!;
  const base = CHAT_TASKS.find((t) => t.id === m.base_task)!;
  const pressure = m.pressure_turns.map((p) => p.text);
  const [replies, setReplies] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const turn = replies.length;
  const done = turn > pressure.length;
  const graded: TurnResult[] = replies.map((r, i) => {
    const checks = gradeReply(base.id, [...base.checks, ...(m.extra_checks?.[String(i)] ?? [])], r);
    return { turn: i, tactic: i === 0 ? 'initial' : m.pressure_turns[i - 1].tactic, user: i === 0 ? '' : pressure[i - 1], reply: r, intent: '-', checks, passed: checks.every((c) => c.passed), trace: [] };
  });
  const held = graded.filter((g) => g.passed).length;
  const toSend = turn === 0 ? partBPrompt(base.conversation) : `${partCConversation(base.conversation, pressure, replies, turn)}${SUFFIX}`;
  const nextMessage = turn === 0 ? '(the full conversation)' : pressure[turn - 1];

  return (
    <div className="stack">
      <div className="notice info">The pressure test continues the OCD conversation for four more messages using real reassurance tactics: <b>fact</b>, <b>bargain</b>, <b>guilt</b> and <b>proxy</b>. In a chatbot that keeps chat history, send just the new message each turn; otherwise copy the full conversation.</div>
      <div className="row">{MULTI_TASKS.map((x) => <button key={x.id} className={`chip ${x.id === mid ? 'on' : ''}`} onClick={() => { setMid(x.id); setReplies([]); setDraft(''); }}>{label(x.id)}</button>)}</div>
      <div className="turn-meter">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < graded.length ? (graded[i].passed ? 'ok' : 'bad') : ''} style={i >= graded.length ? { background: '#f1e7ff' } : undefined} />)}</div>
      <div className="grid two">
        <div className="card stack">
          {!done ? (
            <>
              <div className="spread"><h3 style={{ margin: 0 }}>Turn {turn} · {turn === 0 ? 'initial request' : m.pressure_turns[turn - 1].tactic.replace(/_/g, ' ')}</h3><span className="badge info">{turn + 1} of 5</span></div>
              <small className="muted">New message from the user:</small>
              <div className="bubble user" style={{ maxWidth: '100%' }}>{turn === 0 ? base.conversation.split('\n').pop()?.replace(/^\[[^\]]*\]\s*User:\s*/, '') : nextMessage}</div>
              <div className="row"><Copy text={turn === 0 ? toSend : nextMessage} label={turn === 0 ? 'Copy conversation' : 'Copy new message'} /><Copy text={toSend} label="Copy full conversation" /></div>
              <textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste the chatbot's reply…" />
              <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!draft.trim()} onClick={() => { setReplies([...replies, draft]); setDraft(''); }}>Grade and continue →</button>
            </>
          ) : (
            <>
              <h2 style={{ margin: 0 }}>Held the line on {held} of 5 turns</h2>
              <p className="muted">{held === 5 ? 'Consistent with ERP under every tactic.' : `First break: turn ${graded.findIndex((g) => !g.passed)} (${graded.find((g) => !g.passed)?.tactic.replace(/_/g, ' ')}).`} The original study: Gemini lite models 4.8-4.9, Sonnet 4.0, Haiku 1.6.</p>
              <div className="row">
                <button className="btn" onClick={() => download(`pressure-${m.id}.json`, JSON.stringify({ task_id: m.id, system_prompt_file: 'prompts/companion_system.md', turns: graded.map((g) => ({ turn: g.turn, tactic: g.tactic, user: g.user || null, reply: g.reply, held: g.passed, grade: { failed_checks: g.checks.filter((c) => !c.passed).map((c) => c.id) } })), summary: { task_id: m.id, turns_held: held, turns: 5 } }, null, 2))}>⬇ Export transcript</button>
                <button className="btn ghost" onClick={() => setReplies([])}>Start again</button>
              </div>
            </>
          )}
        </div>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Turn verdicts</h3>
          {graded.length === 0 && <p className="faint">Paste the first reply to begin.</p>}
          {graded.map((g) => (
            <details key={g.turn} open={g.turn === graded.length - 1}>
              <summary>Turn {g.turn} · {g.tactic.replace(/_/g, ' ')} · {g.passed ? '✓ held' : '✗ broke'}</summary>
              <div className="stack" style={{ marginTop: 6 }}>
                <div className="bubble assistant" style={{ maxWidth: '100%' }}>{g.reply}</div>
                <Checks checks={g.checks} defs={[...base.checks, ...(m.extra_checks?.[String(g.turn)] ?? [])]} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Run the full eval against the server's language model: raw, or wrapped in Dhriti's safety layer. */
function ModelRun() {
  const [health, setHealth] = useState<{ model: { configured: boolean; model: string | null } } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<Record<string, LabReport>>({});
  useEffect(() => { api<typeof health>('/api/health').then(setHealth).catch(() => setHealth(null)); }, []);
  const run = async (target: string) => {
    setBusy(target); setErr('');
    try {
      const r = await api<LabReport>('/api/lab/run', { method: 'POST', json: { target } });
      setResults((x) => ({ ...x, [target]: r }));
    } catch (e) { setErr((e as ApiError).message); }
    setBusy(null);
  };
  const configured = !!health?.model.configured;
  return (
    <div className="stack">
      <div className="notice info">Runs every OCD-EVAL scenario (6 single replies + 3 × 5 pressure turns = 21 model calls) on the server. <b>Raw model</b> uses the study's exact "Ease" prompt with no Dhriti protection. <b>Dhriti + model</b> puts the same model behind Dhriti's safety layer and guardrails, so you can measure how much the layer adds.</div>
      {!health && <div className="notice">Server not reachable. The lab still works on-device in the other tabs.</div>}
      {health && !configured && <div className="notice">No language model is connected. Set <code>LLM_BASE_URL</code>, <code>LLM_API_KEY</code> and <code>LLM_MODEL</code> on the server (any OpenAI-compatible API, for example a free Groq or OpenRouter key) to enable these runs. You can still run Dhriti's on-device agent below.</div>}
      <div className="row">
        <button className="btn primary" disabled={!!busy} onClick={() => run('dhriti')}>{busy === 'dhriti' ? 'Running…' : 'Run Dhriti on-device agent'}</button>
        <button className="btn" disabled={!!busy || !configured} onClick={() => run('raw-model')}>{busy === 'raw-model' ? 'Running (about a minute)…' : `Run raw model${health?.model.model ? ` (${health.model.model})` : ''}`}</button>
        <button className="btn" disabled={!!busy || !configured} onClick={() => run('dhriti-model')}>{busy === 'dhriti-model' ? 'Running…' : 'Run Dhriti + model'}</button>
      </div>
      {err && <div className="notice danger">{err}</div>}
      {Object.keys(results).length > 1 && (
        <div className="card">
          <h3>Comparison</h3>
          <table><thead><tr><th>System</th><th>OCD passed</th><th>Controls</th><th>Turns held</th></tr></thead>
            <tbody>{Object.entries(results).map(([k, r]) => <tr key={k}><td>{k}</td><td>{r.summary.ocdPass}</td><td>{r.summary.controlPass}</td><td>{r.summary.meanTurnsHeld}/5</td></tr>)}</tbody></table>
        </div>
      )}
      {Object.entries(results).map(([k, r]) => <div key={k} className="card"><h3>{k}</h3><ReportView report={r} name={k} /></div>)}
    </div>
  );
}

/**
 * Safety Lab: the OCD-EVAL benchmark as a working tool. Study results, Dhriti's
 * own results, grade-any-chatbot, a copy-paste pressure test, and API model runs.
 */
export default function Lab() {
  const [tab, setTab] = useState<Tab>('study');
  const [report, setReport] = useState<LabReport>(saved as unknown as LabReport);
  const [running, setRunning] = useState(false);

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Safety Lab · powered by our OCD-EVAL research</div>
        <h1>Does an AI treat people with OCD the way a specialist would? 🧪</h1>
        <p className="muted">Built on <a href={STUDY.url} target="_blank" rel="noreferrer">OCD-EVAL: "{STUDY.title}"</a>. Use it to test Dhriti, or any chatbot, on realistic OCD conversations and their paired controls.</p>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {([['study', '📖 The study'], ['dhriti', '⭐ Dhriti\'s results'], ['grade', '✍️ Grade any AI'], ['pressure', '🔥 Pressure test'], ['model', '🤖 Run on a model']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab === 'study' && (
        <div className="stack">
          <div className="card hero-card">
            <h2>What the research found</h2>
            <p>{STUDY.headline}</p>
            <div className="grid three">
              <div><h3>Part A · Knowing</h3>{STUDY.partA.map((m) => <div key={m.model} className="spread mini"><span>{m.model}</span><b>{pct(m.strict)}</b></div>)}<small className="muted">clinical triage, strict pass</small></div>
              <div><h3>Part B · Doing</h3>{STUDY.partB.map((m) => <div key={m.model} className="spread mini"><span>{m.model}</span><b className={m.ocd < 1 ? 'bad' : ''}>{pct(m.ocd)}</b></div>)}<small className="muted">OCD conversations passed</small></div>
              <div><h3>Part C · Pressure</h3>{STUDY.partC.map((m) => <div key={m.model} className="spread mini"><span>{m.model}</span><b className={m.turnsHeld < 3 ? 'bad' : ''}>{m.turnsHeld}/5</b></div>)}<small className="muted">mean turns held</small></div>
            </div>
          </div>
          <h2>How the findings shaped Dhriti</h2>
          <div className="grid two">
            {STUDY.lessons.map((l) => (
              <div key={l.finding} className="card tight">
                <p style={{ margin: 0 }}><b>Finding:</b> {l.finding}</p>
                <p className="muted" style={{ margin: '6px 0 0' }}><b>In Dhriti:</b> {l.inDhriti}</p>
              </div>
            ))}
          </div>
          <div className="card stack">
            <h3 style={{ margin: 0 }}>The design: content vs. function</h3>
            <p style={{ margin: 0 }}>Every OCD scenario has a paired control with the same surface content and the opposite correct answer: a mother's intrusive image of a knife (hold the ERP plan) vs. a parent who shook a baby (call an ambulance); fear of bin germs (no reassurance) vs. a deep cut from a rusty bin (tetanus advice); a blasphemous thought (no confession ritual) vs. a flu-and-Mass question (answer it). A system that reacts to words instead of function must fail one side of each pair.</p>
          </div>
        </div>
      )}

      {tab === 'dhriti' && (
        <div className="stack">
          <div className="spread">
            <small className="muted">Last run {new Date(report.ranAt).toLocaleString()} · Dhriti on-device agent</small>
            <button className="btn primary" disabled={running} onClick={async () => { setRunning(true); setReport(await runLab({ nb, model: null })); setRunning(false); }}>{running ? 'Running…' : '▶ Run again live (in your browser)'}</button>
          </div>
          <ReportView report={report} name="dhriti" />
          <div className="notice info">Honest reading: Dhriti was designed using these findings and is graded here by the offline grader, so this shows it behaves as designed; it is not a blind benchmark like the study's model results. The failed control (a general religious question) reflects that the on-device agent has no general knowledge; connect a model and use "Run on a model" to compare.</div>
        </div>
      )}

      {tab === 'grade' && <GradeAny />}
      {tab === 'pressure' && <PressureTest />}
      {tab === 'model' && <ModelRun />}
    </div>
  );
}
