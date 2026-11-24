import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { phrase } from '../../shared/i18n/phrases';
import { speak } from '../lib/speech';

/** Full-screen crisis support. Shown whenever self-harm risk is detected. */
export default function Crisis() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emergency = params.get('type') === 'emergency';
  const { lang, trustedContact } = data.profile;

  useEffect(() => {
    if (!emergency) speak(phrase('crisis', lang), lang, 0.9);
  }, [lang, emergency]);

  if (emergency) {
    return (
      <div className="calm-screen" role="alertdialog" aria-labelledby="em-title">
        <h1 id="em-title">{lang === 'hi' ? 'Abhi ambulance bulaiye' : 'Call for help now'}</h1>
        <p className="muted" style={{ maxWidth: 520 }}>{lang === 'hi' ? 'Unhe bilkul sach bataiye ki kya hua, aur unke saath rahiye.' : 'Tell them exactly what happened and stay with the person until help arrives.'}</p>
        <div className="stack" style={{ width: '100%', maxWidth: 380 }}>
          <a className="btn danger block" href="tel:108">Ambulance: 108</a>
          <a className="btn primary block" href="tel:112">Emergency: 112</a>
          {trustedContact && <a className="btn block" href={`tel:${trustedContact.phone}`}>Call {trustedContact.name}</a>}
        </div>
        <button className="btn ghost small" onClick={() => navigate('/')}>Back</button>
      </div>
    );
  }

  const wa = trustedContact ? `https://wa.me/91${trustedContact.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(phrase('familyAlert', lang))}` : null;

  return (
    <div className="calm-screen" role="alertdialog" aria-labelledby="crisis-title">
      <div className="calm-star" />
      <h1 id="crisis-title" style={{ maxWidth: 560 }}>{lang === 'hi' ? 'Aap akele nahi hain.' : 'You are not alone.'}</h1>
      <p className="muted" style={{ maxWidth: 520 }}>{phrase('crisis', lang)}</p>
      <div className="stack" style={{ width: '100%', maxWidth: 380 }}>
        <a className="btn primary block" href="tel:14416">Call Tele-MANAS 14416 (free, 24x7)</a>
        <a className="btn block" href="tel:18008914416">Or 1-800-891-4416</a>
        {wa && <a className="btn block" href={wa} target="_blank" rel="noreferrer">Message {trustedContact!.name} on WhatsApp</a>}
        {trustedContact && <a className="btn block" href={`tel:${trustedContact.phone}`}>Call {trustedContact.name}</a>}
        <a className="btn danger block" href="tel:112">Emergency: 112</a>
      </div>
      <button className="btn ghost small" onClick={() => navigate('/')}>I am safe right now, go back</button>
    </div>
  );
}
