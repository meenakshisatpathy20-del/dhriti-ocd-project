import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { api } from '../lib/api';
import { useReportData } from './Report';
import { VoiceInput } from '../components/VoiceInput';

interface Msg { id: string; from: 'patient' | 'professional'; text: string; at: string }
interface BookingRow { id: string; slot: string; mode: string; status: string; sharedReport?: unknown; professional: { name: string } }

/** Patient side of a booking: details, consent-based report sharing and secure chat. */
export default function BookingRoom() {
  const { id = '' } = useParams();
  const { data } = useStore();
  const navigate = useNavigate();
  const report = useReportData();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [shared, setShared] = useState(false);
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
          <VoiceInput size="small" onUtterance={(u) => send(u.text)} prompt="Speak or type a message" />
        </div>
        <div className="card stack">
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
