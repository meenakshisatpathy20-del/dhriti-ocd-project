import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DoodleSky } from './components/DoodleSky';
import * as I from './components/Icons';
import { useStore } from './state/store';
import { setMuted } from './lib/speech';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Crisis from './pages/Crisis';
import Panic from './pages/Panic';

const Screening = lazy(() => import('./pages/Screening'));
const Coach = lazy(() => import('./pages/Coach'));
const Ladder = lazy(() => import('./pages/Ladder'));
const Meditate = lazy(() => import('./pages/Meditate'));
const Learn = lazy(() => import('./pages/Learn'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Exposure = lazy(() => import('./pages/Exposure'));
const Journal = lazy(() => import('./pages/Journal'));
const Report = lazy(() => import('./pages/Report'));
const Care = lazy(() => import('./pages/Care'));
const BookingRoom = lazy(() => import('./pages/BookingRoom'));
const DoctorOnboard = lazy(() => import('./pages/DoctorOnboard'));
const DoctorPortal = lazy(() => import('./pages/DoctorPortal'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const Research = lazy(() => import('./pages/Research'));
const Lab = lazy(() => import('./pages/Lab'));

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }>; section?: string }[] = [
  { to: '/', label: 'Talk to Dhriti', icon: I.Home, section: 'Companion' },
  { to: '/coach', label: 'Urge coach (ERP)', icon: I.Wave },
  { to: '/ladder', label: 'Exposure ladder', icon: I.Ladder },
  { to: '/exposure', label: '360° practice', icon: I.Globe },
  { to: '/meditate', label: 'Meditate & music', icon: I.Lotus },
  { to: '/screening', label: 'Screening', icon: I.Shield, section: 'Understand' },
  { to: '/learn', label: 'Lessons', icon: I.Book },
  { to: '/journal', label: 'Voice diary', icon: I.Journal },
  { to: '/report', label: 'Progress report', icon: I.Report },
  { to: '/care', label: 'Find a professional', icon: I.Doctor, section: 'Care' },
  { to: '/profile', label: 'Profile & privacy', icon: I.User },
  { to: '/lab', label: 'Safety Lab (OCD-EVAL)', icon: I.Shield, section: 'Research' },
  { to: '/research', label: 'ML pipeline', icon: I.Flask },
  { to: '/pro', label: 'For professionals', icon: I.Doctor },
];

function Nav({ onPick }: { onPick?: () => void }) {
  return (
    <>
      {NAV.map((n) => (
        <div key={n.to}>
          {n.section && <div className="nav-section">{n.section}</div>}
          <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onPick}>
            <n.icon className="" />
            {n.label}
          </NavLink>
        </div>
      ))}
    </>
  );
}

export default function App() {
  const { data } = useStore();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const fullScreen = loc.pathname === '/panic' || loc.pathname === '/crisis';

  useEffect(() => setMuted(data.profile.muted || data.profile.quiet), [data.profile.muted, data.profile.quiet]);
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => { document.body.classList.toggle('calm-mode', data.profile.calm); }, [data.profile.calm]);

  const proRoute = loc.pathname.startsWith('/pro') || loc.pathname.startsWith('/admin');
  if (!data.profile.onboarded && !proRoute && loc.pathname !== '/research' && loc.pathname !== '/lab') {
    return (
      <>
        <DoodleSky calm={data.profile.calm} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Onboarding />
        </div>
      </>
    );
  }

  return (
    <>
      <DoodleSky calm={data.profile.calm || fullScreen} />
      <div className="mobile-bar">
        <div className="brand" style={{ margin: 0 }}><I.Logo /> <span>Dhriti</span></div>
        <button className="btn small ghost" onClick={() => setMenu((m) => !m)} aria-label="Menu"><I.Menu width={22} /></button>
      </div>
      {menu && <div className="mobile-menu"><Nav onPick={() => setMenu(false)} /></div>}
      <div className="shell">
        <aside className="sidebar">
          <div className="brand"><I.Logo /> <span>Dhriti</span></div>
          <Nav />
          <div style={{ marginTop: 'auto', padding: '18px 12px 0' }}>
            <small className="faint">Dhriti supports care. It does not diagnose or replace a doctor. In crisis call Tele-MANAS 14416.</small>
          </div>
        </aside>
        <main className="main">
          <Suspense fallback={<div className="muted">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/screening" element={<Screening />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/ladder" element={<Ladder />} />
              <Route path="/panic" element={<Panic />} />
              <Route path="/crisis" element={<Crisis />} />
              <Route path="/meditate" element={<Meditate />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:id" element={<Lesson />} />
              <Route path="/exposure" element={<Exposure />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/report" element={<Report />} />
              <Route path="/care" element={<Care />} />
              <Route path="/care/booking/:id" element={<BookingRoom />} />
              <Route path="/pro" element={<DoctorPortal />} />
              <Route path="/pro/join" element={<DoctorOnboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/research" element={<Research />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      {!fullScreen && !proRoute && (
        <button className="sos" onClick={() => navigate('/panic')} aria-label="Panic SOS">SOS</button>
      )}
    </>
  );
}
