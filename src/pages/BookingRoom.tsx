import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { api } from '../lib/api';
import { useReportData } from './Report';
import { VoiceInput } from '../components/VoiceInput';
import { classify } from '../../shared/nlp/classifier';

interface Msg { id: string; from: 'patient' | 'professional'; text: string; at: string }
interface BookingRow { id: string; slot: string; mode: string; status: string; sharedReport?: unknown; carePlan?: { text: string; at: string }; professional: { name: string } }

/** Patient side of a booking: details, consent-based report sharing and secure chat. */
export default function BookingRoom() {
  const { id = '' } = useParams();
  const { data, setProfile } = useStore();
  const navigate = useNavigate();
  const report = useReportData();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [shared, setShared] = useState(false);
  const [risk, setRisk] = useState(false);
  const headers = { 'x-patient-id': data.profile.patientId };

  const load = () => {
    api<BookingRow[]>(`/api/bookings?patientId=${data.profile.patientId}`).then((list) => {
      const b = list.find((x) => x.id === id) ?? null;
      setBooking(b);
      setShared(!!b?.sharedReport);
    });
    api<Msg[]>(`/api/bookings/${id}/messages`, { headers }).then(setMsgs).catch(() => undefined);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const send = async (text: string) => {
    // Professionals may not read messages straight away: never let a crisis wait in a chat.
    const c = classify(text);
    if (c.intent === 'SELF_HARM' || c.intent === 'EMERGENCY' || c.riskCheck) setRisk(true);
    await api(`/api/bookings/${id}/messages`, { method: 'POST', headers, json: { text } });
    load();
  };

  const share = async () => {
    if (!confirm('Share your 14-day Dhriti summary (scores, urge outcomes, reassurance count) with this professional? Diary text is not included.')) return;
    await api(`/api/bookings/${id}/share-report`, { method: 'POST', headers, json: { consent: true, report } });
    setShared(true);
  };

  if (!booking) return <div className="card">Loading booking…</div>;

  return (
    <div>
      <div className="page-head">
        <div className="kicker">Your session</div>
        <h1>{booking.professional.name}</h1>
        <p className="muted">{new Date(booking.slot).toLocaleString()} · {booking.mode} · <span className="badge info">{booking.status}</span></p>
      </div>
      <div className="grid two">
        <div className="card stack">
          <h3>Chat</h3>
          <div className="chat">
            {msgs.length === 0 && <p className="faint">Say hello, or ask about the session. Messages are visible only to you and this professional.</p>}
            {msgs.map((m) => <div key={m.id} className={`bubble ${m.from === 'patient' ? 'user' : 'assistant'}`}>{m.text}</div>)}
          </div>
          {risk && (
            <div className="notice danger stack" style={{ gap: 8 }}>
              <b>Your professional may not see this right away.</b>
              <span>If you are thinking of harming yourself or someone is hurt, please get help now.</span>
              <div className="row"><a className="btn small danger" href="tel:14416">Tele-MANAS 14416</a><a className="btn small" href="tel:112">Emergency 112</a></div>
            </div>
          )}
          <VoiceInput size="small" onUtterance={(u) => send(u.text)} prompt="Speak or type a message" />
        </div>
        <div className="card stack">
          {booking.carePlan && (
            <div className="notice info stack" style={{ gap: 8 }}>
              <b>Your ERP plan from {booking.professional.name}</b>
              <span>"{booking.carePlan.text}"</span>
              {data.profile.carePlan?.text === booking.carePlan.text
                ? <span className="badge ok" style={{ alignSelf: 'flex-start' }}>Dhriti is using this plan</span>
                : <button className="btn small primary" style={{ alignSelf: 'flex-start' }} onClick={() => setProfile({ carePlan: { text: booking.carePlan!.text, from: booking.professional.name, at: booking.carePlan!.at } })}>Use this plan in Dhriti</button>}
            </div>
          )}
          <h3>Share your progress report</h3>
          <p className="muted">Your data stays on your phone until you choose to share it. Sharing sends a summary, not your diary.</p>
          {shared ? <span className="badge ok">Report shared</span> : <button className="btn primary" onClick={share}>Share 14-day summary</button>}
          {booking.mode === 'online' && <div className="notice info">At session time, your professional will send a video link here in chat.</div>}
          <button className="btn ghost" onClick={async () => { await api(`/api/bookings/${id}/status`, { method: 'POST', headers, json: { status: 'cancelled' } }); navigate('/care'); }}>Cancel booking</button>
        </div>
      </div>
    </div>
  );
}
