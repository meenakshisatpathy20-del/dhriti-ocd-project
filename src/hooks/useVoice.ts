import { useCallback, useEffect, useRef, useState } from 'react';
import { Recognizer, recognitionSupported } from '../lib/speech';
import type { AppLang } from '../../shared/i18n/phrases';

export interface VoiceUtterance {
  text: string;
  confidence: number | null;
  /** Where it came from: browser speech, typing, or Wispr Flow dictation into the text box. */
  source: 'speech' | 'text';
}

const LOW_CONFIDENCE = 0.6;

/**
 * One-shot or continuous listening with the noise and failure handling from
 * the product spec: empty or low-confidence results count as a failure; after
 * two failures the caller is told to switch to the text box.
 */
export function useVoice(lang: AppLang, onUtterance: (u: VoiceUtterance) => void, opts: { continuous?: boolean } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [failures, setFailures] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognizer | null>(null);
  const cbRef = useRef(onUtterance);
  cbRef.current = onUtterance;
  const gotFinal = useRef(false);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!recognitionSupported()) {
      setError('unsupported');
      return false;
    }
    stop();
    gotFinal.current = false;
    setError(null);
    setInterim('');
    const rec = new Recognizer({
      lang,
      continuous: opts.continuous,
      onResult: (r) => {
        if (!r.final) {
          setInterim(r.text);
          return;
        }
        gotFinal.current = true;
        setInterim('');
        const text = r.text.trim();
        if (!text || (r.confidence !== null && r.confidence < LOW_CONFIDENCE)) {
          setFailures((f) => f + 1);
          setError('noise');
          return;
        }
        setFailures(0);
        cbRef.current({ text, confidence: r.confidence, source: 'speech' });
        if (!opts.continuous) stop();
      },
      onEnd: () => {
        setListening(false);
        if (!gotFinal.current && !opts.continuous) {
          setError((e) => e ?? 'silence');
        }
      },
      onError: (e) => {
        if (e === 'not-allowed' || e === 'service-not-allowed') setError('blocked');
        else if (e === 'no-speech') setError('silence');
        else if (e !== 'aborted') {
          setFailures((f) => f + 1);
          setError('noise');
        }
      },
    });
    recRef.current = rec;
    const ok = rec.start();
    setListening(ok);
    return ok;
  }, [lang, opts.continuous, stop]);

  useEffect(() => stop, [stop]);

  const submitText = useCallback((text: string) => {
    const t = text.trim();
    if (t) cbRef.current({ text: t, confidence: null, source: 'text' });
  }, []);

  return { listening, interim, failures, error, start, stop, submitText, supported: recognitionSupported(), useTextFallback: failures >= 2 || error === 'blocked' || !recognitionSupported() };
}
