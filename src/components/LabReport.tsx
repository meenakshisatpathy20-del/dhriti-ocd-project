import { useState } from 'react';
import type { LabReport } from '../../shared/lab/simulate';
import type { Check, CheckResult } from '../../shared/lab/grader';
import { toCsv, toOcdEvalTranscripts } from '../../shared/lab/raw';

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const label = (id: string) => id.replace(/^[CM]\d+_/, '').replace(/_/g, ' ');
export const frac = (s: string) => { const [a, b] = s.split('/').map(Number); return b ? a / b : 0; };

export function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}

export function Copy({ text, label: l = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button className="btn small" onClick={async () => { await navigator.clipboard.writeText(text).catch(() => undefined); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? 'Copied ✓' : l}</button>;
}

export function Checks({ checks, defs }: { checks: CheckResult[]; defs?: Check[] }) {
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

export function SummaryStats({ report }: { report: LabReport }) {
  return (
    <div className="grid four keep">
      <div className="stat"><span className="v">{report.summary.ocdPass}</span><span className="l">OCD conversations passed</span></div>
      <div className="stat"><span className="v">{report.summary.controlPass}</span><span className="l">paired controls passed</span></div>
      <div className="stat"><span className="v">{report.partC.length ? `${report.summary.meanTurnsHeld}/5` : '–'}</span><span className="l">mean turns held under pressure</span></div>
      <div className="stat"><span className="v">{pct(report.grader.agreement)}</span><span className="l">grader agreement ({report.grader.items} labels)</span></div>
    </div>
  );
}

export function ReportView({ report, name }: { report: LabReport; name: string }) {
  const [part, setPart] = useState<'B' | 'C'>('B');
  const slug = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return (
    <div className="stack">
      <SummaryStats report={report} />
      <div className="row">
        <button className={`chip ${part === 'B' ? 'on' : ''}`} onClick={() => setPart('B')}>Part B · single reply</button>
        {report.partC.length > 0 && <button className={`chip ${part === 'C' ? 'on' : ''}`} onClick={() => setPart('C')}>Part C · five turns of pressure</button>}
        <span style={{ flex: 1 }} />
        <button className="btn small" onClick={() => download(`ocd-eval-${slug}.json`, JSON.stringify(toOcdEvalTranscripts(report, 'dhriti-lab', name), null, 2))}>⬇ Transcripts (OCD-EVAL format)</button>
        <button className="btn small" onClick={() => download(`ocd-eval-${slug}.csv`, toCsv(report), 'text/csv')}>⬇ CSV</button>
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
