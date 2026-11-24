import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lessonById, LESSONS } from '../../shared/clinical/lessons';
import { parseOption } from '../../shared/nlp/answers';
import { useStore } from '../state/store';
import { speak, stopSpeaking } from '../lib/speech';
import { VoiceInput } from '../components/VoiceInput';

export default function Lesson() {
  const { id = '' } = useParams();
  const lesson = lessonById(id);
  const { data, update } = useStore();
  const navigate = useNavigate();
  const [answer, setAnswer] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const lang = data.profile.lang;

  if (!lesson) return <div className="card">Lesson not found.</div>;
  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const next = LESSONS[idx + 1];

  const readAloud = async () => {
    setReading(true);
    await speak(lang === 'hi' ? lesson.summary.hi : lesson.summary.en, lang);
    for (const s of lesson.sections) {
      // Body text is English; it is read with an English voice for clarity.
      await speak(`${s.heading}. ${s.body}`, 'en');
    }
    await speak(`${lesson.quiz.question} ${lesson.quiz.options.map((o, i) => `${i + 1}: ${o}`).join('. ')}`, 'en');
    setReading(false);
  };

  const choose = (i: number) => {
    setAnswer(i);
    const correct = i === lesson.quiz.answer;
    speak(`${correct ? (lang === 'hi' ? 'Bilkul sahi.' : 'Exactly right.') : (lang === 'hi' ? 'Koi baat nahi.' : 'Not quite.')} ${lesson.quiz.explain}`, correct || lang !== 'hi' ? 'en' : lang);
    update((d) => ({ ...d, lessons: { ...d.lessons, [lesson.id]: { completedAt: new Date().toISOString(), quizCorrect: correct } } }));
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="kicker">Lesson {idx + 1} · {lesson.minutes} min</div>
        <h1>{lesson.title.en}</h1>
        <p className="muted">{lang === 'hi' ? lesson.summary.hi : lesson.summary.en}</p>
        <div className="row">
          {!reading ? <button className="btn primary" onClick={readAloud}>▶ Read aloud</button> : <button className="btn" onClick={() => { stopSpeaking(); setReading(false); }}>Stop</button>}
        </div>
      </div>
      {lesson.sections.map((s) => (
        <div key={s.heading} className="card"><h3>{s.heading}</h3><p style={{ margin: 0 }}>{s.body}</p></div>
      ))}
      <div className="card stack">
        <h2>{lesson.quiz.question}</h2>
        {lesson.quiz.options.map((o, i) => (
          <button key={o} className={`chip ${answer === i ? 'on' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => choose(i)}><b>{i + 1}</b> {o}</button>
        ))}
        {answer === null && <VoiceInput size="small" prompt='Say "first", "second" or the answer' onUtterance={(u) => { const k = parseOption(u.text, lesson.quiz.options); if (k !== null) choose(k); }} />}
        {answer !== null && (
          <div className={`notice ${answer === lesson.quiz.answer ? 'info' : ''}`}>{answer === lesson.quiz.answer ? '✓ ' : ''}{lesson.quiz.explain}</div>
        )}
        <div className="spread">
          <button className="btn ghost" onClick={() => navigate('/learn')}>All lessons</button>
          {next && <button className="btn" onClick={() => { setAnswer(null); navigate(`/learn/${next.id}`); }}>Next: {next.title.en} →</button>}
        </div>
      </div>
    </div>
  );
}
