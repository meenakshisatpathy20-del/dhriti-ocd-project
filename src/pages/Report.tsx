import { useMemo } from 'react';
import { useStore } from '../state/store';
import { LineChart, Bars } from '../components/Charts';
import { isTreatmentResponse } from '../../shared/clinical/instruments';

/** Build the doctor-facing summary from on-device data. Also used when sharing with a booked professional. */
export function useReportData() {
  const { data, route } = useStore();
  return useMemo(() => {
    const since = Date.now() - 14 * 86400000;
    const recent = data.episodes.filter((e) => Date.parse(e.at) >= since);
    const outcomes = { resisted: 0, delayed: 0, did: 0 };
    recent.forEach((e) => e.outcome && outcomes[e.outcome]++);
    const triggers = new Map<string, number>();
    recent.forEach((e) => triggers.set(e.extraction.compulsion, (triggers.get(e.extraction.compulsion) ?? 0) + 1));
    const peakByDay = new Map<string, number[]>();
    recent.forEach((e) => {
      const day = e.at.slice(0, 10);
      const peak = Math.max(0, ...e.suds.map((s) => s.value));
      peakByDay.set(day, [...(peakByDay.get(day) ?? []), peak]);
    });
    const ybocsSeries = data.screenings.filter((s) => s.ybocs).map((s) => ({ at: s.at, total: s.ybocs!.result.total, band: s.ybocs!.result.band }));
    const baseline = ybocsSeries[0]?.total;
    const latest = ybocsSeries[ybocsSeries.length - 1]?.total;
    const reassurance14 = data.reassurance.filter((r) => r.at >= since).length;
    return {
      generatedAt: new Date().toISOString(),
      patientAlias: data.profile.name || 'Patient',
      careLevel: route.level,
      careLabel: route.label,
      ybocsSeries,
      response: baseline !== undefined && latest !== undefined && ybocsSeries.length > 1 ? isTreatmentResponse(baseline, latest) : null,
      latestOcir: data.screenings.filter((s) => s.ocir).slice(-1)[0]?.ocir?.result ?? null,
      episodes14: recent.length,
      outcomes,
      topCompulsions: [...triggers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      peakTrend: [...peakByDay.entries()].sort().map(([day, peaks]) => ({ day, avgPeak: peaks.reduce((a, b) => a + b, 0) / peaks.length })),
      reassurance14,
      practice14: data.practice.filter((p) => Date.parse(p.at) >= since).length,
      diaryCount: data.diary.length,
      ladderMastered: data.ladder.filter((l) => l.mastered).length,
      ladderTotal: data.ladder.length,
    };
  }, [data, route]);
}

export default function Report() {
  const r = useReportData();
  const total = r.outcomes.resisted + r.outcomes.delayed + r.outcomes.did;
  return (
    <div>
      <div className="page-head spread">
        <div>
          <div className="kicker">Progress report · last 14 days</div>
          <h1>{r.patientAlias}'s Dhriti summary</h1>
          <p className="muted" style={{ margin: 0 }}>Generated {new Date(r.generatedAt).toLocaleString()} · Care level {r.careLevel} ({r.careLabel}). Self-reported data; screening, not diagnosis.</p>
        </div>
        <button className="btn primary no-print" onClick={() => window.print()}>Download PDF</button>
      </div>

      <div className="grid four keep">
        <div className="card tight stat"><span className="v">{r.episodes14}</span><span className="l">urge episodes logged</span></div>
        <div className="card tight stat"><span className="v">{total ? Math.round(((r.outcomes.resisted + r.outcomes.delayed) / total) * 100) : 0}%</span><span className="l">resisted or delayed</span></div>
        <div className="card tight stat"><span className="v">{r.reassurance14}</span><span className="l">reassurance requests</span></div>
        <div className="card tight stat"><span className="v">{r.ladderMastered}/{r.ladderTotal}</span><span className="l">ladder steps mastered</span></div>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Y-BOCS over time (0-40)</h3>
          <LineChart max={40} points={r.ybocsSeries.map((s, i) => ({ x: i, y: s.total }))} label="Y-BOCS totals" />
          {r.response !== null && <p className={r.response ? '' : 'muted'}>{r.response ? '35% or greater reduction from baseline: meets the standard definition of treatment response.' : 'Not yet a 35% reduction from baseline.'}</p>}
        </div>
        <div className="card">
          <h3>Average peak anxiety per day (0-10)</h3>
          <LineChart points={r.peakTrend.map((p, i) => ({ x: i, y: p.avgPeak }))} label="Peak anxiety trend" />
        </div>
        <div className="card">
          <h3>Most frequent compulsions</h3>
          {r.topCompulsions.length ? <Bars max={Math.max(...r.topCompulsions.map((t) => t[1]))} items={r.topCompulsions.map(([k, v]) => ({ label: k, value: v }))} /> : <p className="faint">No episodes yet.</p>}
        </div>
        <div className="card">
          <h3>ERP outcomes</h3>
          <Bars max={Math.max(1, total)} items={[{ label: 'resisted', value: r.outcomes.resisted }, { label: 'delayed', value: r.outcomes.delayed }, { label: 'did the compulsion', value: r.outcomes.did }]} />
          {r.latestOcir && <p className="muted" style={{ marginTop: 12 }}>Latest OCI-R: {r.latestOcir.total}/72 · dominant: {r.latestOcir.dominant.join(', ') || 'none'}</p>}
          <p className="muted">Practice sessions (breathing, meditation, 360°): {r.practice14}. Diary entries: {r.diaryCount}.</p>
        </div>
      </div>
    </div>
  );
}
