import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, uid } from '../state/store';
import { parseRating } from '../../shared/nlp/numbers';
import { classify } from '../../shared/nlp/classifier';
import type { OcirSubscale } from '../../shared/clinical/instruments';
import { VoiceInput } from '../components/VoiceInput';

/** Clinician-style starter steps for each OCI-R symptom dimension (adapted to Indian daily life). */
const TEMPLATES: Record<OcirSubscale, { situation: string; suds: number }[]> = {
  washing: [
    { situation: 'Touch the door handle and wait 5 minutes before washing', suds: 3 },
    { situation: 'Hold money or a mobile phone without washing for 15 minutes', suds: 5 },
    { situation: 'Sit on a bus or metro seat and eat a snack afterwards without washing', suds: 7 },
    { situation: 'Touch the floor near the shoes and then cook a simple meal', suds: 9 },
  ],
  checking: [
    { situation: 'Lock the door once and walk away without looking back', suds: 4 },
    { situation: 'Turn off the gas once and leave the kitchen', suds: 6 },
    { situation: 'Send an email or message without re-reading it', suds: 5 },
    { situation: 'Leave home for an hour after checking everything only once', suds: 8 },
  ],
  ordering: [
    { situation: 'Leave one book slightly crooked on the shelf for a day', suds: 3 },
    { situation: 'Let someone else arrange the kitchen shelf', suds: 6 },
    { situation: 'Wear mismatched socks for a day', suds: 5 },
  ],
  neutralizing: [
    { situation: 'Do a task without counting, finishing on an "unlucky" number', suds: 5 },
    { situation: 'Write a "bad" number on paper and keep it in your pocket', suds: 7 },
  ],
  obsessing: [
    { situation: 'Write the intrusive thought once and read it aloud', suds: 6 },
    { situation: 'Listen to a recording of the thought in your own voice for 10 minutes', suds: 8 },
    { situation: 'Say "this is the OCD talking" and continue your work without praying it away', suds: 5 },
  ],
  hoarding: [
    { situation: 'Throw away one old newspaper without checking it', suds: 4 },
    { situation: 'Give away one unused item of clothing', suds: 6 },
  ],
};

export default function Ladder() {
  const { data, update, latestScreening, careLevel } = useStore();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<{ situation: string; suds: number | null } | null>(null);
  const steps = useMemo(() => [...data.ladder].sort((a, b) => a.suds - b.suds), [data.ladder]);
  const dominant = latestScreening?.ocir?.result.dominant ?? [];

  const add = (situation: string, suds: number) => {
    update((d) => ({ ...d, ladder: [...d.ladder, { id: uid(), situation, suds, practised: 0, mastered: false }] }));
  };

  const onVoice = (text: string) => {
    if (classify(text).intent === 'SELF_HARM') return navigate('/crisis');
    if (!draft) {
      // A single utterance may carry both: "touch the bus seat, seven"
      const n = parseRating(text);
      const situation = text.replace(/[,\s]+(\d+|saat|aath|chhe|paanch|seven|eight|six|five|four|three)\s*$/i, '').trim();
      if (n !== null && situation.length > 3) add(situation, n);
      else setDraft({ situation: text, suds: null });
    } else {
      const n = parseRating(text);
      if (n !== null) {
        add(draft.situation, n);
        setDraft(null);
      }
    }
  };

  const suggestions = dominant.flatMap((d) => TEMPLATES[d] ?? []).filter((t) => !data.ladder.some((s) => s.situation === t.situation));

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Exposure ladder</div>
        <h1>Your ERP steps, from easiest to hardest</h1>
        <p className="muted">Say a situation that triggers your OCD and how scary it feels from 0 to 10. Example: "bus ki seat chhoona, saat".</p>
      </div>

      {careLevel === 4 && <div className="notice" style={{ marginBottom: 16 }}>At your current care level, build and climb this ladder together with your psychiatrist or psychologist.</div>}

      <div className="grid two">
        <div className="card stack">
          <h2>{draft ? 'How scary is it, 0 to 10?' : 'Add a step by voice'}</h2>
          {draft && <p className="muted">"{draft.situation}"</p>}
          <VoiceInput onUtterance={(u) => onVoice(u.text)} size="small" />
          {draft && (
            <div className="row">
              {Array.from({ length: 11 }, (_, n) => <button key={n} className="chip" onClick={() => { add(draft.situation, n); setDraft(null); }}>{n}</button>)}
            </div>
          )}
          {suggestions.length > 0 && (
            <>
              <h3 style={{ marginTop: 10 }}>Suggested for your profile ({dominant.join(', ')})</h3>
              {suggestions.slice(0, 5).map((s) => (
                <div key={s.situation} className="spread card tight">
                  <span>{s.situation} <span className="faint">· {s.suds}/10</span></span>
                  <button className="btn small" onClick={() => add(s.situation, s.suds)}>Add</button>
                </div>
              ))}
            </>
          )}
          {!latestScreening && <p className="faint">Take the screening to get suggestions matched to your symptom profile.</p>}
        </div>

        <div className="card stack">
          <h2>Your ladder</h2>
          {steps.length === 0 && <p className="faint">No steps yet.</p>}
          {steps.map((s, idx) => (
            <div key={s.id} className="card tight">
              <div className="spread">
                <span><b>{idx + 1}.</b> {s.situation}</span>
                <span className={`badge ${s.mastered ? 'ok' : 'info'}`}>{s.mastered ? 'mastered' : `${s.suds}/10`}</span>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small primary" disabled={careLevel === 4} onClick={() => {
                  update((d) => ({ ...d, ladder: d.ladder.map((x) => (x.id === s.id ? { ...x, practised: x.practised + 1 } : x)) }));
                  navigate('/coach', { state: { situation: s.situation } });
                }}>Practise now</button>
                <button className="btn small" onClick={() => update((d) => ({ ...d, ladder: d.ladder.map((x) => (x.id === s.id ? { ...x, mastered: !x.mastered } : x)) }))}>{s.mastered ? 'Unmark' : 'Mark mastered'}</button>
                <button className="btn small ghost" onClick={() => update((d) => ({ ...d, ladder: d.ladder.filter((x) => x.id !== s.id) }))}>Remove</button>
                <span className="faint" style={{ fontSize: '0.85rem' }}>practised {s.practised}×</span>
              </div>
            </div>
          ))}
          {steps.length > 0 && <p className="faint">Start with steps around 3-4/10. Move up when a step feels about half as scary as it did.</p>}
        </div>
      </div>
    </div>
  );
}
