import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, uid } from '../state/store';
import {
  OCIR_ITEMS, OCIR_OPTIONS, OCIR_CUTOFF, YBOCS_ITEMS, PHQ_ITEMS, PHQ_OPTIONS, scoreOcir, scoreYbocs, scoreMood, routeCare, adjustForMood,
  type Lang, type OcirResult, type YbocsResult, type MoodResult,
} from '../../shared/clinical/instruments';
import { parseLikert, parseOption } from '../../shared/nlp/answers';
import { classify } from '../../shared/nlp/classifier';
import { phrase } from '../../shared/i18n/phrases';
import { speak } from '../lib/speech';
import { VoiceInput } from '../components/VoiceInput';
import { Bars } from '../components/Charts';
import model from '../../shared/ml/model.json';

type Stage = 'intro' | 'ocir' | 'between' | 'ybocs' | 'mood' | 'result';

export default function Screening() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const lang = data.profile.lang;
  const ilang: Lang = lang === 'hi' ? 'hi' : 'en';
  const [stage, setStage] = useState<Stage>('intro');
  const [i, setI] = useState(0);
  const [ocirAns, setOcirAns] = useState<number[]>([]);
  const [ybocsAns, setYbocsAns] = useState<number[]>([]);
  const [ocir, setOcir] = useState<OcirResult | null>(null);
  const [ybocs, setYbocs] = useState<YbocsResult | null>(null);
  const [moodAns, setMoodAns] = useState<number[]>([]);
  const [mood, setMood] = useState<MoodResult | null>(null);
  const [miss, setMiss] = useState('');

  const question = stage === 'ocir' ? OCIR_ITEMS[i].text[ilang] : stage === 'ybocs' ? YBOCS_ITEMS[i].question[ilang] : stage === 'mood' ? PHQ_ITEMS[i].text[ilang] : '';
  const options = stage === 'ocir' ? OCIR_OPTIONS[ilang] : stage === 'ybocs' ? YBOCS_ITEMS[i].options[ilang] : stage === 'mood' ? PHQ_OPTIONS[ilang] : [];

  useEffect(() => {
    if (stage === 'ocir' || stage === 'ybocs' || stage === 'mood') {
      const optText = stage !== 'ocir' ? ` ${options.map((o, k) => `${k + 1}: ${o}`).join('. ')}` : '';
      speak(question + optText, lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i]);

  const answer = (value: number) => {
    setMiss('');
    if (stage === 'ocir') {
      const next = [...ocirAns, value];
      setOcirAns(next);
      if (next.length === OCIR_ITEMS.length) {
        const r = scoreOcir(next);
        setOcir(r);
        setStage('between');
        speak(r.likelyOcd
          ? (lang === 'hi' ? 'Shukriya. Ab kuch sawaal yeh samajhne ke liye ki yeh kitna asar daal raha hai.' : 'Thank you. Now a few questions about how much this affects you.')
          : (lang === 'hi' ? 'Shukriya. Aapka score OCD ki sambhavna kam dikhata hai.' : 'Thank you. Your score suggests OCD is unlikely right now.'), lang);
      } else setI(i + 1);
    } else if (stage === 'ybocs') {
      const next = [...ybocsAns, value];
      setYbocsAns(next);
      if (next.length === YBOCS_ITEMS.length) {
        setYbocs(scoreYbocs(next));
        toMood();
      } else setI(i + 1);
    } else if (stage === 'mood') {
      const next = [...moodAns, value];
      setMoodAns(next);
      if (next.length === PHQ_ITEMS.length) {
        const m = scoreMood(next);
        setMood(m);
        finish(ocir, ybocs, ybocsAns, next, m);
        if (m.safetyFlag) navigate('/crisis');
      } else setI(i + 1);
    }
  };

  const toMood = () => {
    setStage('mood');
    setI(0);
    speak(lang === 'hi' ? 'Ab teen chhote sawaal aapke mood ke baare mein.' : 'Now three short questions about your mood.', lang);
  };

  const finish = (o: OcirResult | null, y: YbocsResult | null, yAns: number[] | null, mAns: number[], m: MoodResult) => {
    const route = adjustForMood(routeCare(o, y), m);
    update((d) => ({
      ...d,
      screenings: [...d.screenings, {
        id: uid(), at: new Date().toISOString(),
        ocir: o ? { answers: ocirAns.length === 18 ? ocirAns : [], result: o } : null,
        ybocs: y && yAns && yAns.length === 10 ? { answers: yAns, result: y } : null,
        mood: { answers: mAns, result: m },
        route,
      }],
    }));
    setStage('result');
    speak(`${phrase('notDiagnosis', lang)} ${route.recommendation}`, lang);
  };

  const onVoice = (text: string) => {
    if (classify(text).intent === 'SELF_HARM') return navigate('/crisis');
    const v = stage === 'ocir' ? parseLikert(text) : stage === 'mood' ? (parseOption(text, PHQ_OPTIONS[ilang]) ?? parseOption(text, PHQ_OPTIONS.en)) : parseOption(text, YBOCS_ITEMS[i].options[ilang]) ?? parseOption(text, YBOCS_ITEMS[i].options.en);
    if (v === null) {
      setMiss(lang === 'hi' ? 'Samajh nahi aaya. Neeche se chuniye ya dobara boliye.' : "I didn't catch an answer. Choose below or say it again.");
      return;
    }
    answer(v);
  };

  const percentile = useMemo(() => {
    if (!ybocs) return null;
    const totals = model.cohort.totals as number[];
    const below = totals.filter((t) => t < ybocs.total).length;
    return Math.round((below / totals.length) * 100);
  }, [ybocs]);

  const total = stage === 'ocir' ? OCIR_ITEMS.length : stage === 'mood' ? PHQ_ITEMS.length : YBOCS_ITEMS.length;
  const finalRoute = adjustForMood(routeCare(ocir, ybocs), mood);

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Spoken screening</div>
        <h1>OCI-R and Y-BOCS, by voice</h1>
        <p className="muted">Two standard questionnaires. Answer in your own words, in any language, or tap an option. {phrase('notDiagnosis', lang)}</p>
      </div>

      {stage === 'intro' && (
        <div className="card stack">
          <h2>How it works</h2>
          <ol className="muted" style={{ paddingLeft: 20 }}>
            <li><b>OCI-R</b> (18 statements): a score of {OCIR_CUTOFF} or more suggests likely OCD.</li>
            <li><b>Y-BOCS</b> (10 questions): measures severity from 0 to 40.</li>
            <li><b>Mood check</b> (3 questions): OCD often comes with low mood, so we ask about it too.</li>
            <li>Dhriti then suggests the right level of support, from self-help to a psychiatrist.</li>
          </ol>
          {(lang === 'ta' || lang === 'bn') && <div className="notice">Questions are shown in English for now; you can answer in {lang === 'ta' ? 'Tamil' : 'Bengali'}.</div>}
          <div className="row">
            <button className="btn primary" onClick={() => { setStage('ocir'); speak(phrase('screeningIntro', lang), lang); }}>Start (about 6 minutes)</button>
            <button className="btn" onClick={() => { setStage('ybocs'); setI(0); }}>Only the severity check (Y-BOCS)</button>
          </div>
        </div>
      )}

      {(stage === 'ocir' || stage === 'ybocs' || stage === 'mood') && (
        <div className="card stack">
          <div className="spread">
            <span className="badge info">{stage === 'ocir' ? 'OCI-R' : stage === 'mood' ? 'Mood check' : 'Y-BOCS'} · {i + 1} of {total}</span>
            <button className="btn small ghost" onClick={() => speak(question, lang)}>Repeat</button>
          </div>
          <div className="progress"><div style={{ width: `${(i / total) * 100}%` }} /></div>
          <h2 style={{ margin: '10px 0' }}>{question}</h2>
          {stage === 'ocir' && <p className="faint">In the past month, how much has this bothered you?</p>}
          <div className="stack" style={{ gap: 8 }}>
            {options.map((o, k) => (
              <button key={o} className="chip" style={{ justifyContent: 'flex-start' }} onClick={() => answer(k)}>
                <b>{k + 1}</b> {o}
              </button>
            ))}
          </div>
          {miss && <div className="notice">{miss}</div>}
          <VoiceInput size="small" onUtterance={(u) => onVoice(u.text)} prompt={stage === 'ocir' ? 'Say e.g. "thoda" or "kaafi"' : 'Say the option number or the words'} />
        </div>
      )}

      {stage === 'between' && ocir && (
        <div className="card stack">
          <h2>OCI-R score: {ocir.total} / 72</h2>
          <p className="muted">{ocir.likelyOcd ? `At or above ${OCIR_CUTOFF}: OCD is likely. Next, Y-BOCS measures how severe it is.` : `Below ${OCIR_CUTOFF}: OCD looks unlikely. You can still check severity if you're worried.`}</p>
          <div className="row">
            <button className="btn primary" onClick={() => { setStage('ybocs'); setI(0); }}>Continue to Y-BOCS</button>
            {!ocir.likelyOcd && <button className="btn" onClick={toMood}>Skip to the mood check</button>}
          </div>
        </div>
      )}

      {stage === 'result' && (
        <div className="grid two">
          <div className="card stack">
            <span className="badge warn" style={{ alignSelf: 'flex-start' }}>{phrase('notDiagnosis', 'en')}</span>
            {ybocs && (
              <>
                <h2>Y-BOCS: {ybocs.total} / 40 · <span style={{ textTransform: 'capitalize' }}>{ybocs.band}</span></h2>
                <p className="muted">Obsessions {ybocs.obsessions}/20 · Compulsions {ybocs.compulsions}/20</p>
              </>
            )}
            {ocir && <p>OCI-R: <b>{ocir.total}</b> / 72 {ocir.likelyOcd ? '(likely OCD)' : '(OCD unlikely)'}</p>}
            {mood && <p>Mood check: PHQ-2 <b>{mood.phq2}</b> / 6 {mood.depressionFlag ? '(low mood: worth checking with a professional)' : ''}</p>}
            <h3>Your care level: {finalRoute.level} · {finalRoute.label}</h3>
            <p>{finalRoute.recommendation}</p>
            {mood?.safetyFlag && <a className="btn danger" href="tel:14416">Talk to Tele-MANAS 14416 now</a>}
            <div className="row">
              {finalRoute.referToProfessional && <button className="btn primary" onClick={() => navigate('/care')}>Find a verified professional</button>}
              {finalRoute.selfGuidedErp && <button className="btn" onClick={() => navigate('/ladder')}>Build my exposure ladder</button>}
              <button className="btn ghost" onClick={() => navigate('/learn')}>Learn about OCD</button>
            </div>
          </div>
          <div className="card stack">
            {ocir && (
              <>
                <h3>Symptom profile (OCI-R subscales, 0-12 each)</h3>
                <Bars max={12} items={Object.entries(ocir.subscales).map(([k, v]) => ({ label: k, value: v }))} />
                {ocir.dominant.length > 0 && <p className="muted">Most prominent: {ocir.dominant.join(', ')}.</p>}
              </>
            )}
            {percentile !== null && (
              <div className="notice info">
                Research comparison: your Y-BOCS total is higher than {percentile}% of the {model.dataset.validRows} valid records in our public research dataset.
                <br /><small>That dataset failed our clinical audit (synthetic), so treat this only as a demonstration of the ML pipeline, not a clinical comparison.</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
