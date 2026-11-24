import { useEffect, useRef, useState } from 'react';
import { useVoice, type VoiceUtterance } from '../hooks/useVoice';
import { useStore } from '../state/store';
import { phrase } from '../../shared/i18n/phrases';
import { Mic } from './Icons';

/**
 * The one voice input used everywhere: a mic orb with live transcript, plus a
 * text box fallback. The text box is designed to work with Wispr Flow: focus
 * it, hold your Flow key and speak, and Flow types the words in.
 */
export function VoiceInput({ onUtterance, prompt, size = 'big', autoStart = false, placeholder }: {
  onUtterance: (u: VoiceUtterance) => void;
  prompt?: string;
  size?: 'big' | 'small';
  autoStart?: boolean;
  placeholder?: string;
}) {
  const { data } = useStore();
  const lang = data.profile.lang;
  const v = useVoice(lang, onUtterance);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const forceText = data.profile.quiet || data.profile.wisprMode || v.useTextFallback || typing;

  useEffect(() => {
    if (autoStart && !forceText) v.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (forceText) textRef.current?.focus();
  }, [forceText]);

  const send = () => {
    v.submitText(text);
    setText('');
  };

  const status = v.listening
    ? v.interim || phrase('listening', lang)
    : v.error === 'noise'
      ? phrase('noise', lang)
      : v.error === 'silence'
        ? phrase('silence', lang)
        : v.error === 'blocked'
          ? 'Microphone is blocked. You can type instead.'
          : prompt ?? '';

  return (
    <div className="orb-wrap">
      {!forceText && (
        <>
          <div className={`orb-stage ${size === 'small' ? 'small' : ''} ${v.listening ? 'listening' : ''}`}>
          <span className="orbit" aria-hidden />
          <span className="orbit two" aria-hidden />
          <button
            type="button"
            className={`orb ${size === 'small' ? 'small' : ''} ${v.listening ? 'listening' : ''}`}
            onClick={() => (v.listening ? v.stop() : v.start())}
            aria-label={v.listening ? 'Stop listening' : 'Tap and speak'}
          >
            <Mic />
          </button>
          </div>
          {v.listening && <div className="soundbars" aria-hidden><span /><span /><span /><span /><span /></div>}
          <div className="transcript" aria-live="polite">{status}</div>
          <button type="button" className="btn small ghost" onClick={() => { v.stop(); setTyping(true); }}>⌨ Type instead</button>
        </>
      )}
      {(forceText || v.failures > 0) && (
        <div className="stack" style={{ width: '100%', maxWidth: 560 }}>
          {v.useTextFallback && !data.profile.quiet && !data.profile.wisprMode && (
            <div className="notice info">{v.supported ? phrase('didNotCatch', lang) : 'Voice input is not available in this browser. Type below, or use Wispr Flow dictation.'}</div>
          )}
          <textarea
            ref={textRef}
            rows={2}
            value={text}
            placeholder={placeholder ?? (data.profile.wisprMode ? 'Hold your Wispr Flow key and speak…' : 'Type here, or dictate with Wispr Flow…')}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="spread">
            <small className="faint">
              {data.profile.wisprMode ? 'Wispr Flow mode: dictation types straight into this box.' : data.profile.quiet ? 'Quiet mode: nothing is spoken aloud.' : 'Tip: Wispr Flow dictation works in this box too.'}
              {typing && v.supported && <> · <a href="#" onClick={(e) => { e.preventDefault(); setTyping(false); }}>use mic</a></>}
            </small>
            <button className="btn small primary" onClick={send} disabled={!text.trim()}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
