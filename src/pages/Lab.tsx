import { useMemo, useState } from 'react';
import { STUDY } from '../../shared/lab/study';
import { CHAT_TASKS, runLab, type LabReport } from '../../shared/lab/simulate';
import { gradeReply } from '../../shared/lab/grader';
import { runAgent } from '../../shared/agent/run';
import type { NaiveBayesModel } from '../../shared/ml/core';
import nbJson from '../../shared/ml/intent-nb.json';
import saved from '../../shared/lab/lab-results.json';

const nb = nbJson as unknown as NaiveBayesModel;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const label = (id: string) => id.replace(/^[CM]\d+_/, '').replace(/_/g, ' ');

function Checks({ checks }: { checks: { id: string; kind: string; passed: boolean }[] }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      {checks.map((c) => (
        <span key={c.id} className={`badge ${c.passed ? 'ok' : 'danger'}`} title={c.kind === 'must' ? 'must do' : 'must not do'}>
          {c.passed ? '✓' : '✗'} {c.kind === 'must_not' ? 'no ' : ''}{c.id.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

/**
 * Safety Lab: Dhriti's AI is tested in simulation against the OCD-EVAL
 * research scenarios before any real person meets it.
 */
export default function Lab() {
  const [report, setReport] = useState<LabReport>(saved as unknown as LabReport);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'B' | 'C'>('B');
  const [taskId, setTaskId] = useState(CHAT_TASKS[0].id);
  const [probe, setProbe] = useState('');
  const [probeOut, setProbeOut] = useState<{ reply: string; checks: ReturnType<typeof gradeReply> } | null>(null);
  const task = useMemo(() => CHAT_TASKS.find((t) => t.id === taskId)!, [taskId]);

  const runLive = async () => {
    setRunning(true);
    const r = await runLab({ nb, model: null });
    setReport(r);
    setRunning(false);
  };

  const runProbe = async () => {
    if (!probe.trim()) return;
    const res = await runAgent(probe, { lang: 'en', careLevel: 2, reassurance: [], history: [] }, { nb, model: null });
    setProbeOut({ reply: res.reply, checks: gradeReply(task.id, task.checks, res.reply) });
  };

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Safety Lab · powered by our OCD-EVAL research</div>
        <h1>We test Dhriti's AI in simulation before it talks to anyone 🧪</h1>
        <p className="muted">Every reply Dhriti gives is checked against the scenarios from <a href={STUDY.url} target="_blank" rel="noreferrer">OCD-EVAL: "{STUDY.title}"</a>, our study of how AI models treat people with OCD.</p>
      </div>

      <div className="card hero-card">
        <h2>What the research found</h2>
        <p>{STUDY.headline}</p>
        <div className="grid three">
          <div>
            <h3>Part A · Knowing (triage)</h3>
            {STUDY.partA.map((m) => <div key={m.model} className="spread mini"><span>{m.model}</span><b>{pct(m.strict)}</b></div>)}
          </div>
          <div>
            <h3>Part B · Doing (one reply)</h3>
            {STUDY.partB.map((m) => <div key={m.model} className="spread mini"><span>{m.model}</span><b className={m.ocd < 1 ? 'bad' : ''}>{pct(m.ocd)}</b></div>)}
            <small className="muted">OCD conversations passed</small>
          </div>
          <div>
            <h3>Part C · Under pressure</h3>
            {STUDY.partC.map((m) => <div key={m.model} className="spread mini"><span>{m.model}</span><b className={m.turnsHeld < 3 ? 'bad' : ''}>{m.turnsHeld}/5</b></div>)}
            <small className="muted">mean turns held</small>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 26 }}>How the findings shaped Dhriti</h2>
      <div className="grid two">
        {STUDY.lessons.map((l) => (
          <div key={l.finding} className="card tight">
            <p style={{ margin: 0 }}><b>Finding:</b> {l.finding}</p>
            <p className="muted" style={{ margin: '6px 0 0' }}><b>In Dhriti:</b> {l.inDhriti}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="spread">
          <div>
            <h2 style={{ margin: 0 }}>Dhriti in the lab</h2>
            <small className="muted">Last run {new Date(report.ranAt).toLocaleString()} · engine: {report.engine === 'model' ? 'language model + safety layer' : 'on-device agent'}</small>
          </div>
          <button className="btn primary" onClick={runLive} disabled={running}>{running ? 'Running simulation…' : '▶ Run the lab live'}</button>
        </div>
        <div className="grid four keep" style={{ marginTop: 14 }}>
          <div className="stat"><span className="v">{report.summary.ocdPass}</span><span className="l">OCD conversations passed</span></div>
          <div className="stat"><span className="v">{report.summary.controlPass}</span><span className="l">paired controls passed</span></div>
          <div className="stat"><span className="v">{report.summary.meanTurnsHeld}/5</span><span className="l">turns held under pressure</span></div>
          <div className="stat"><span className="v">{pct(report.grader.agreement)}</span><span className="l">grader agreement with hand labels ({report.grader.items})</span></div>
        </div>
        <div className="notice info" style={{ marginTop: 12 }}>
          Honest reading: Dhriti's agent was designed using these findings and is graded here by an offline rule-based grader (validated against the study's hand labels), so this is not a blind benchmark score like the study's model results. The failed control (a general religious question) shows the on-device agent has no general knowledge; with a language model connected, the model answers it under Dhriti's guardrails.
        </div>
      </div>

      <div className="row" style={{ margin: '18px 0 10px' }}>
        <button className={`chip ${tab === 'B' ? 'on' : ''}`} onClick={() => setTab('B')}>Part B · single reply</button>
        <button className={`chip ${tab === 'C' ? 'on' : ''}`} onClick={() => setTab('C')}>Part C · five turns of pressure</button>
      </div>

      {tab === 'B' && (
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

      {tab === 'C' && (
        <div className="stack">
          {report.partC.map((c) => (
            <div key={c.task} className="card stack">
              <div className="spread">
                <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{label(c.task)}</h3>
                <span className={`badge ${c.firstBreak === null ? 'ok' : 'danger'}`}>held {c.turnsHeld}/5</span>
              </div>
              <div className="turn-meter">{c.turns.map((t) => <span key={t.turn} className={t.passed ? 'ok' : 'bad'} title={t.tactic} />)}</div>
              {c.turns.map((t) => (
                <details key={t.turn}>
                  <summary><b>Turn {t.turn}</b> · {t.tactic.replace(/_/g, ' ')} · {t.passed ? '✓ held' : '✗ broke'}</summary>
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
      )}

      <div className="card stack" style={{ marginTop: 18 }}>
        <h2 style={{ margin: 0 }}>Try your own test message</h2>
        <p className="muted" style={{ margin: 0 }}>Pick a scenario's checks, write a message as that user would, and see Dhriti's reply graded live.</p>
        <div className="row">
          {CHAT_TASKS.map((t) => <button key={t.id} className={`chip ${t.id === taskId ? 'on' : ''}`} onClick={() => { setTaskId(t.id); setProbeOut(null); }}>{label(t.id)}</button>)}
        </div>
        <textarea rows={3} value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="e.g. Just tell me once that my hands are clean, then I'll stop asking. Please." />
        <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={runProbe}>Test Dhriti</button>
        {probeOut && (
          <>
            <div className="bubble assistant">{probeOut.reply}</div>
            <Checks checks={probeOut.checks} />
          </>
        )}
      </div>
    </div>
  );
}
