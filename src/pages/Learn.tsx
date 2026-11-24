import { useNavigate } from 'react-router-dom';
import { LESSONS } from '../../shared/clinical/lessons';
import { useStore } from '../state/store';

export default function Learn() {
  const { data } = useStore();
  const navigate = useNavigate();
  const done = Object.keys(data.lessons).length;
  return (
    <div>
      <div className="page-head">
        <div className="kicker">Lessons · read aloud in your language</div>
        <h1>Understand OCD, step by step</h1>
        <p className="muted">{done} of {LESSONS.length} complete. Each lesson ends with one spoken question.</p>
        <div className="progress" style={{ maxWidth: 420 }}><div style={{ width: `${(done / LESSONS.length) * 100}%` }} /></div>
      </div>
      <div className="grid three">
        {LESSONS.map((l, i) => (
          <button key={l.id} className="feature" onClick={() => navigate(`/learn/${l.id}`)}>
            <div className="spread" style={{ width: '100%' }}>
              <span className="badge info">Lesson {i + 1} · {l.minutes} min</span>
              {data.lessons[l.id] && <span className="badge ok">done</span>}
            </div>
            <span className="t">{l.title.en}</span>
            <span className="s">{l.title.hi}</span>
            <span className="s">{l.summary.en}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
