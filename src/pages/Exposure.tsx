import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useStore, uid } from '../state/store';
import { speak, Recognizer, recognitionSupported } from '../lib/speech';
import { parseRating } from '../../shared/nlp/numbers';
import { classify } from '../../shared/nlp/classifier';
import { tokens, containsPhrase } from '../../shared/nlp/normalize';
import { playMood, stopMusic } from '../lib/music';
import { LineChart } from '../components/Charts';

/**
 * 360° graded exposure, no headset required.
 * Drag (or turn your phone) to look around; "Enter VR" uses WebXR on supported
 * phones with a cardboard viewer. Voice is the controller: rate anxiety 0-10,
 * say "aage / next" to move up a step, "ruko / pause" or "bas / stop".
 */

interface SceneDef {
  id: string;
  title: string;
  theme: string;
  steps: string[];
  build: (scene: THREE.Scene) => void;
}

function noiseTexture(base: string, spots: string, density: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < density; i++) {
    g.fillStyle = spots;
    g.globalAlpha = Math.random() * 0.5;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, Math.random() * 6, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function room(scene: THREE.Scene, wall: string, floor: THREE.Texture) {
  const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshStandardMaterial({ color: wall, side: THREE.BackSide, roughness: 0.9 }));
  walls.position.y = 2;
  scene.add(walls);
  floor.repeat.set(6, 6);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: floor, roughness: 1 }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.y = -0.99;
  scene.add(fl);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', 2.4));
  scene.add(new THREE.AmbientLight('#fff4ea', 0.8));
  const l = new THREE.PointLight('#fff2d6', 40, 30);
  l.position.set(0, 4, 0);
  scene.add(l);
}

const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.position.set(x, y, z);
  return m;
};

const SCENES: SceneDef[] = [
  {
    id: 'washroom',
    title: 'Railway station washroom',
    theme: 'Contamination',
    steps: [
      'Look around the washroom. Notice the floor and the sink.',
      'Look closely at the tap handle that many people have touched.',
      'Imagine touching the tap handle with your bare hand.',
      'Imagine touching the door handle on the way out, and not washing.',
      'Imagine eating a biscuit with those hands.',
    ],
    build: (s) => {
      room(s, '#9fb3a8', noiseTexture('#7d8a83', '#3b2f22', 900));
      s.add(box(2.4, 0.2, 1, '#e8ece9', 0, 0.2, -5.3));
      const tap = box(0.15, 0.5, 0.15, '#c0c6c9', 0, 0.55, -5.6);
      s.add(tap);
      s.add(box(1.2, 2.6, 0.1, '#5b4636', 4, 0.3, -5.9));
      s.add(box(0.12, 0.3, 0.12, '#b9a27a', 3.6, 0.4, -5.8));
      s.add(box(1.4, 1.4, 0.1, '#cfd6d2', 0, 1.8, -5.9));
    },
  },
  {
    id: 'stove',
    title: 'Home kitchen: the gas stove',
    theme: 'Checking',
    steps: [
      'Look at the gas stove. The knobs are turned off.',
      'Look at the knobs once. Do not count or recheck.',
      'Turn towards the kitchen door, away from the stove.',
      'Imagine leaving the house for college without going back.',
      'Imagine the whole day passing without checking.',
    ],
    build: (s) => {
      room(s, '#e9d9b8', noiseTexture('#8a6f53', '#6b543e', 120));
      s.add(box(5, 1.8, 1.2, '#6d5a4a', 0, -0.1, -5.3));
      s.add(box(2.2, 0.15, 0.9, '#2b2b2b', 0, 0.85, -5.3));
      [-0.6, 0.6].forEach((x) => {
        const burner = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: '#111' }));
        burner.rotation.x = Math.PI / 2;
        burner.position.set(x, 0.95, -5.3);
        s.add(burner);
        s.add(box(0.12, 0.12, 0.12, '#d9d9d9', x, 0.6, -4.68));
      });
      s.add(box(1.3, 2.6, 0.1, '#7a5638', -5.9, 0.3, 0).rotateY(Math.PI / 2));
    },
  },
  {
    id: 'door',
    title: 'Front door lock',
    theme: 'Checking / harm',
    steps: [
      'Look at the front door. It has been locked once.',
      'Notice the doubt: "What if it is not locked?" Let it stay.',
      'Turn around and look at the stairs.',
      'Imagine walking down the stairs without going back.',
      'Imagine sitting in class while the doubt is still there.',
    ],
    build: (s) => {
      room(s, '#c9c3d9', noiseTexture('#9d958b', '#6d665e', 200));
      s.add(box(2, 3.4, 0.15, '#6b4226', 0, 0.7, -5.9));
      s.add(box(0.25, 0.25, 0.1, '#d4af37', 0.6, 0.7, -5.8));
      for (let i = 0; i < 6; i++) s.add(box(3, 0.25, 0.8, '#8c8c8c', 0, -0.9 + i * 0.3, 3 + i * 0.6));
    },
  },
  {
    id: 'knife',
    title: 'Kitchen counter with a knife',
    theme: 'Harm OCD',
    steps: [
      'Look at the kitchen. A knife is lying on the counter.',
      'Look directly at the knife. Notice the thought "what if I…" and let it stay.',
      'Imagine picking up the knife and chopping vegetables for dinner.',
      'Imagine someone you love walking into the kitchen while you hold it, and carrying on cooking.',
      'Say: "This is the OCD talking. Thoughts are not actions." Stay with the anxiety.',
    ],
    build: (s) => {
      room(s, '#f3dcc4', noiseTexture('#9a7b5f', '#7a5e46', 150));
      s.add(box(6, 1.8, 1.2, '#8b6b52', 0, -0.1, -5.3));
      s.add(box(6, 0.12, 1.3, '#e9e4dc', 0, 0.85, -5.3));
      const blade = box(0.9, 0.03, 0.14, '#d9dde1', 0.4, 0.93, -5.1); blade.rotation.y = 0.4; s.add(blade);
      const handle = box(0.45, 0.07, 0.12, '#2b1d14', -0.25, 0.94, -4.85); handle.rotation.y = 0.4; s.add(handle);
      s.add(box(0.5, 0.25, 0.5, '#e66b3f', -1.6, 1.05, -5.3));
      s.add(box(0.35, 0.35, 0.35, '#7fbf5a', 1.8, 1.08, -5.3));
    },
  },
  {
    id: 'symmetry',
    title: 'A crooked bookshelf',
    theme: 'Symmetry / "just right"',
    steps: [
      'Look at the bookshelf. Some books lean, and the picture frame is tilted.',
      'Look at the most crooked book. Notice the urge to straighten it.',
      'Keep looking for one minute without fixing anything.',
      'Imagine leaving the room with everything exactly as it is.',
      'Imagine it staying like this until tomorrow.',
    ],
    build: (s) => {
      room(s, '#d9e8f5', noiseTexture('#a7a19a', '#8b857e', 120));
      s.add(box(3.2, 3.2, 0.6, '#9c6b43', 0, 0.6, -5.6));
      [0.0, 1.0, 2.0].forEach((sh) => s.add(box(3.0, 0.08, 0.55, '#7a5233', 0, -0.4 + sh, -5.5)));
      const colors = ['#e4572e', '#29335c', '#f3a712', '#669bbc', '#a8c686', '#ff7ab6'];
      for (let i = 0; i < 12; i++) {
        const bk = box(0.16, 0.6 + (i % 3) * 0.08, 0.4, colors[i % colors.length], -1.2 + i * 0.21, -0.05 + (i > 5 ? 1 : 0), -5.45);
        bk.rotation.z = i % 4 === 1 ? 0.35 : i % 5 === 2 ? -0.2 : 0;
        s.add(bk);
      }
      const frame = box(1.2, 0.9, 0.06, '#f5d6a0', 2.8, 1.8, -5.9); frame.rotation.z = 0.18; s.add(frame);
    },
  },
  {
    id: 'prayer',
    title: 'A quiet prayer room',
    theme: 'Religious / scrupulosity',
    steps: [
      'Look around the prayer room: the lamp, the flowers, the place to sit.',
      'Notice any unwanted thought that comes. Do not push it away.',
      'Imagine an upsetting thought arriving during prayer.',
      'Stay seated without repeating the prayer or asking for forgiveness.',
      'Say: "This is the OCD, not my faith." Let the doubt stay unanswered.',
    ],
    build: (s) => {
      room(s, '#fbe3c4', noiseTexture('#c9a27a', '#b38a62', 90));
      s.add(box(2.6, 0.9, 1.0, '#8b3a3a', 0, -0.55, -5.3));
      s.add(box(1.4, 1.6, 0.2, '#f2c14e', 0, 0.9, -5.85));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff8c1a', emissiveIntensity: 1.2 }));
      lamp.position.set(0.7, 0.0, -5.0); s.add(lamp);
      [-0.8, -0.5, 0.5, 0.8].forEach((x) => s.add(box(0.18, 0.18, 0.18, '#ff7ab6', x, 0.0, -5.0)));
      s.add(box(2.0, 0.08, 1.4, '#c0392b', 0, -0.95, -2.5));
    },
  },
];

export default function Exposure() {
  const { data, update, careLevel } = useStore();
  const navigate = useNavigate();
  const lang = data.profile.lang;
  const host = useRef<HTMLDivElement>(null);
  const [sceneId, setSceneId] = useState(SCENES[0].id);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [suds, setSuds] = useState<{ x: number; y: number }[]>([]);
  const [heard, setHeard] = useState('');
  const [xr, setXr] = useState(false);
  const [gyro, setGyro] = useState(false);
  const gyroRef = useRef(false);
  gyroRef.current = gyro;
  const def = SCENES.find((s) => s.id === sceneId)!;
  const t0 = useRef(0);
  const sudsRef = useRef<{ x: number; y: number }[]>([]);
  sudsRef.current = suds;

  // three.js renderer with drag / gyro look-around and optional WebXR.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.xr.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f6ecff');
    def.build(scene);
    const camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0, 0.6, 0);
    let yaw = 0;
    let pitch = 0;
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => (drag = { x: e.clientX, y: e.clientY });
    const move = (e: PointerEvent) => {
      if (!drag) return;
      yaw -= (e.clientX - drag.x) * 0.005;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => (drag = null);
    const orient = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null) return;
      yaw = THREE.MathUtils.degToRad(e.alpha);
      pitch = THREE.MathUtils.degToRad(Math.max(-60, Math.min(60, (e.beta ?? 90) - 90)));
    };
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    if (gyroRef.current) window.addEventListener('deviceorientation', orient);
    const resize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', resize);
    renderer.setAnimationLoop(() => {
      if (!renderer.xr.isPresenting) camera.rotation.set(pitch, yaw, 0, 'YXZ');
      renderer.render(scene, camera);
    });
    const nav = navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean>; requestSession: (m: string, o?: object) => Promise<XRSession> } };
    nav.xr?.isSessionSupported('immersive-vr').then(setXr).catch(() => setXr(false));
    (el as HTMLDivElement & { enterVr?: () => void }).enterVr = async () => {
      const session = await nav.xr!.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
      renderer.xr.setSession(session);
    };
    return () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('deviceorientation', orient);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [def, gyro]);

  // Voice controller during a session.
  useEffect(() => {
    if (!active || !recognitionSupported()) return;
    const rec = new Recognizer({
      lang,
      continuous: true,
      onResult: (r) => {
        if (!r.final) return;
        setHeard(r.text);
        const t = tokens(r.text);
        const c = classify(r.text);
        if (c.intent === 'SELF_HARM') return navigate('/crisis');
        if (c.intent === 'PANIC') return navigate('/panic');
        if (['bas', 'stop', 'band karo', 'exit'].some((p) => containsPhrase(t, p))) return end();
        if (['aage', 'next', 'agla', 'age badho', 'continue'].some((p) => containsPhrase(t, p))) return nextStep();
        const v = parseRating(r.text);
        if (v !== null) rateNow(v);
      },
    });
    rec.start();
    return () => rec.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lang, step]);

  const begin = () => {
    setActive(true);
    setStep(0);
    setSuds([]);
    t0.current = Date.now();
    playMood('focus', 0.04);
    speak(`${def.steps[0]} ${lang === 'hi' ? 'Anxiety 0 se 10 mein boliye. Aage badhne ke liye "aage" boliye.' : 'Say your anxiety from 0 to 10. Say "next" to move on.'}`, lang);
  };

  const rateNow = (v: number) => {
    setSuds((s) => [...s, { x: (Date.now() - t0.current) / 60000, y: v }]);
    speak(v >= 8 ? (lang === 'hi' ? 'Yeh mushkil hai. Isi step par rukte hain.' : 'That is hard. Let us stay on this step.') : (lang === 'hi' ? 'Theek hai.' : 'Okay.'), lang);
  };

  const nextStep = () => {
    const n = step + 1;
    if (n >= def.steps.length) return end();
    setStep(n);
    speak(def.steps[n], lang);
  };

  const end = () => {
    setActive(false);
    stopMusic();
    const s = sudsRef.current;
    if (s.length) {
      update((d) => ({ ...d, practice: [...d.practice, { id: uid(), at: new Date().toISOString(), kind: 'vr', detail: `${def.title}: reached step ${step + 1}, peak ${Math.max(...s.map((p) => p.y))}, end ${s[s.length - 1].y}`, minutes: Math.max(1, Math.round((Date.now() - t0.current) / 60000)) }] }));
    }
    speak(lang === 'hi' ? 'Aaj ka practice poora hua. Shabash.' : 'Practice complete. Well done.', lang);
  };

  return (
    <div>
      <div className="page-head">
        <div className="kicker">360° exposure practice · no headset needed</div>
        <h1>Practise facing triggers in a safe scene</h1>
        <p className="muted">Drag or turn your phone to look around. Say your anxiety (0-10), "aage" for the next step, or "bas" to stop.</p>
        {careLevel === 4 && <div className="notice">Severe symptoms: please use exposure scenes only with your therapist's guidance.</div>}
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        {SCENES.map((s) => (
          <button key={s.id} className={`chip ${s.id === sceneId ? 'on' : ''}`} disabled={active} onClick={() => setSceneId(s.id)}>{s.title} <span className="faint">· {s.theme}</span></button>
        ))}
      </div>
      <div className="vr-canvas" ref={host} />
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card stack">
          <span className="badge info" style={{ alignSelf: 'flex-start' }}>Step {step + 1} of {def.steps.length}</span>
          <h3>{def.steps[step]}</h3>
          {heard && <small className="faint">Heard: "{heard}"</small>}
          <div className="row">
            {!active ? <button className="btn primary" onClick={begin}>Begin practice</button> : <button className="btn" onClick={nextStep}>Next step</button>}
            {active && <button className="btn ghost" onClick={end}>Stop</button>}
            <button className={`btn ${gyro ? 'primary' : ''}`} onClick={async () => {
              const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
              if (!gyro && D.requestPermission) { try { if ((await D.requestPermission()) !== 'granted') return; } catch { return; } }
              setGyro(!gyro);
            }}>{gyro ? '📱 Motion on' : '📱 Look by moving phone'}</button>
            {xr && <button className="btn" onClick={() => (host.current as HTMLDivElement & { enterVr?: () => void })?.enterVr?.()}>Enter VR</button>}
          </div>
          {active && (
            <div className="row">{Array.from({ length: 11 }, (_, n) => <button key={n} className="chip" onClick={() => rateNow(n)}>{n}</button>)}</div>
          )}
        </div>
        <div className="card">
          <h3>Anxiety during this session</h3>
          <LineChart points={suds} label="Anxiety during exposure" />
        </div>
      </div>
    </div>
  );
}
