import * as THREE from 'three';
import type { Ambience } from '../lib/music';

/**
 * 3D scenes for 360° exposure practice. Each scene is a small, furnished,
 * life-size room (metres; floor at y = 0, eye height 1.6) built from simple
 * shapes and canvas textures, so it loads instantly and works offline.
 *
 * Every step of the exposure hierarchy has a `focus` (what to look at) and a
 * `cam` (where you stand): later steps move you closer to the trigger, which is
 * how graded exposure works in a therapist's office.
 */

export type V3 = [number, number, number];
export interface Step { text: string; focus: V3; cam: V3 }
export interface SceneDef {
  id: string;
  title: string;
  theme: string;
  sound: Ambience;
  intro: string;
  steps: Step[];
  /** Builds the room; may return a per-frame function for small animations (a flickering lamp, a drip). */
  build: (scene: THREE.Scene) => ((t: number) => void) | void;
}

// ---------- Textures ----------

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function grime(g: CanvasRenderingContext2D, w: number, h: number, color: string, n: number, size = 6) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = color;
    g.globalAlpha = Math.random() * 0.35;
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, Math.random() * size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

const tiles = (base: string, grout: string, n: number, dirt: number, repeat: [number, number]) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    const s = 256 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = `rgba(0,0,0,${rnd(0, 0.05)})`;
      g.fillRect(i * s, j * s, s, s);
    }
    g.strokeStyle = grout;
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke();
    }
    grime(g, 256, 256, '#3b2f22', dirt);
  }, repeat);

const wood = (base: string, line: string, repeat: [number, number]) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle = `rgba(0,0,0,${rnd(0, 0.08)})`;
      g.fillRect(0, y, 256, 32);
      g.strokeStyle = line;
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      for (let k = 0; k < 6; k++) {
        g.globalAlpha = 0.25;
        g.beginPath(); g.moveTo(0, y + rnd(4, 28)); g.bezierCurveTo(80, y + rnd(4, 28), 170, y + rnd(4, 28), 256, y + rnd(4, 28)); g.stroke();
        g.globalAlpha = 1;
      }
    }
  }, repeat);

const plaster = (base: string, repeat: [number, number] = [2, 1]) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    grime(g, 256, 256, '#00000022', 500, 3);
    grime(g, 256, 256, '#ffffff', 300, 2);
  }, repeat);

const sign = (text: string, bg: string, fg: string, w = 256, h = 128) =>
  canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = `bold ${Math.round(h * 0.32)}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    text.split('\n').forEach((line, i, all) => g.fillText(line, w / 2, h / 2 + (i - (all.length - 1) / 2) * h * 0.38));
  });

const sky = () =>
  canvasTex(128, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#8ec5ff');
    gr.addColorStop(1, '#e9f4ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.8;
    [[30, 40], [90, 30], [70, 70]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 22, 8, 0, 0, Math.PI * 2); g.fill(); });
    g.globalAlpha = 1;
    g.fillStyle = '#9aa7b0';
    for (let x = 0; x < 128; x += 16) g.fillRect(x, 100 - rnd(0, 30), 14, 40);
  });

// ---------- Shapes ----------

type MatOpts = THREE.MeshStandardMaterialParameters;
const mat = (color: string | THREE.Texture, o: MatOpts = {}) =>
  new THREE.MeshStandardMaterial(typeof color === 'string' ? { color, roughness: 0.75, ...o } : { map: color, roughness: 0.8, ...o });

function put<T extends THREE.Object3D>(s: THREE.Scene | THREE.Object3D, o: T, x: number, y: number, z: number, ry = 0, rz = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  o.rotation.z = rz;
  s.add(o);
  return o;
}
const B = (s: THREE.Scene, w: number, h: number, d: number, c: string | THREE.Texture, x: number, y: number, z: number, o: MatOpts = {}, ry = 0, rz = 0) =>
  put(s, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)), x, y, z, ry, rz);
const C = (s: THREE.Scene, rt: number, rb: number, h: number, c: string, x: number, y: number, z: number, o: MatOpts = {}) =>
  put(s, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 24), mat(c, o)), x, y, z);
const S = (s: THREE.Scene, r: number, c: string, x: number, y: number, z: number, o: MatOpts = {}) =>
  put(s, new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat(c, o)), x, y, z);

const W = 7; // room width (x)
const D = 7; // room depth (z)
const H = 3; // ceiling height

/** Walls, floor, ceiling, a ceiling light and soft lighting. */
function room(s: THREE.Scene, wall: THREE.Texture, floor: THREE.Texture, ceiling = '#f4f1ea', warm = false) {
  const wm = mat(wall, { roughness: 0.95 });
  const fm = mat(floor, { roughness: 0.9 });
  const cm = mat(ceiling, { roughness: 1 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [wm, wm, cm, fm, wm, wm]);
  box.material.forEach((m) => (m.side = THREE.BackSide));
  box.position.y = H / 2;
  s.add(box);
  // skirting
  [[0, -D / 2 + 0.01, 0], [0, D / 2 - 0.01, Math.PI], [-W / 2 + 0.01, 0, Math.PI / 2], [W / 2 - 0.01, 0, -Math.PI / 2]].forEach(([x, z, r]) =>
    put(s, new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.02), mat('#000000', { transparent: true, opacity: 0.25 })), x, 0.05, z, r));
  s.add(new THREE.HemisphereLight(warm ? '#fff1dc' : '#ffffff', '#7a6a5a', 1.6));
  s.add(new THREE.AmbientLight(warm ? '#ffe6c7' : '#f4f6ff', 0.5));
  const l = new THREE.PointLight(warm ? '#ffd9a0' : '#fff6e6', 18, 14, 1.6);
  l.position.set(0, H - 0.3, 0);
  s.add(l);
  B(s, 1.1, 0.04, 0.12, '#ffffff', 0, H - 0.03, 0, { emissive: '#ffffff', emissiveIntensity: 1 });
}

/** A window on a wall, looking at the sky. `ry` turns it to face into the room. */
function windowAt(s: THREE.Scene, x: number, y: number, z: number, ry: number, w = 1.3, h = 1) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sky() })));
  const fr = mat('#f2efe8');
  [[0, h / 2, w + 0.1, 0.06], [0, -h / 2, w + 0.1, 0.1], [0, 0, 0.05, h]].forEach(([px, py, fw, fh]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.06), fr);
    m.position.set(px, py, 0.02);
    g.add(m);
  });
  [-w / 2, w / 2].forEach((px) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), fr); m.position.set(px, 0, 0.02); g.add(m); });
  put(s, g, x, y, z, ry);
}

/** A door on a wall with a handle. Returns the handle position for focusing. */
function door(s: THREE.Scene, x: number, z: number, ry: number, color: string, w = 0.95): V3 {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.BoxGeometry(w, 2.1, 0.05), mat(color, { roughness: 0.6 }));
  d.position.y = 1.05;
  g.add(d);
  [0.55, 1.5].forEach((py) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w - 0.25, 0.7, 0.02), mat(color, { roughness: 0.5, color: new THREE.Color(color).multiplyScalar(0.85) })); p.position.set(0, py, 0.03); g.add(p); });
  const fr = mat('#e8e2d6');
  [[-w / 2 - 0.04, 1.07, 0.08, 2.18], [w / 2 + 0.04, 1.07, 0.08, 2.18], [0, 2.14, w + 0.16, 0.08]].forEach(([px, py, fw, fh]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.06), fr); m.position.set(px, py, 0.01); g.add(m); });
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.05), mat('#c9a227', { metalness: 0.8, roughness: 0.3 }));
  h.position.set(w / 2 - 0.12, 1.0, 0.06);
  g.add(h);
  put(s, g, x, 0, z, ry);
  const v = new THREE.Vector3(w / 2 - 0.12, 1.0, 0.06).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  return [x + v.x, 1.0, z + v.z];
}

function clock(s: THREE.Scene, x: number, y: number, z: number, ry = 0, tilt = 0) {
  const face = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fffdf7'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#333'; g.lineWidth = 5; g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = '#333'; g.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 2, 4, 4); }
    g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(64, 64); g.lineTo(92, 70); g.stroke();
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ map: face }));
  put(s, m, x, y, z, ry, tilt);
}

// ---------- Scenes ----------

export const SCENES: SceneDef[] = [
  {
    id: 'washroom',
    title: 'Railway station washroom',
    theme: 'Contamination',
    sound: 'washroom',
    intro: 'A public washroom at a busy station. Many people have used these sinks today.',
    steps: [
      { text: 'Look around the washroom. Notice the floor and the sinks.', focus: [0, 1, -3.2], cam: [0, 1.6, 1.6] },
      { text: 'Walk closer. Look at the tap handle that many people have touched.', focus: [-0.8, 1.12, -3.3], cam: [-0.6, 1.55, -1.5] },
      { text: 'Imagine touching the tap handle with your bare hand. Do not wipe it off.', focus: [-0.8, 1.12, -3.3], cam: [-0.75, 1.5, -2.45] },
      { text: 'Imagine pushing the door handle on the way out, and not washing.', focus: [3.4, 1, 0.53], cam: [2.1, 1.6, 0.6] },
      { text: 'Imagine eating a biscuit from this packet with those hands.', focus: [1.3, 0.99, -3.1], cam: [1.15, 1.5, -2.2] },
    ],
    build: (s) => {
      room(s, tiles('#e4ebe6', '#9aa59f', 8, 260, [6, 3]), tiles('#8d918b', '#4d4a43', 6, 900, [6, 6]), '#dfe3df');
      B(s, 3.2, 0.8, 0.55, '#aab7b0', 0, 0.45, -3.22);
      B(s, 3.2, 0.1, 0.62, '#d9dedb', 0, 0.9, -3.18, { roughness: 0.4 });
      [-0.8, 0.8].forEach((x) => {
        B(s, 0.6, 0.05, 0.4, '#bcc6c1', x, 0.955, -3.15, { roughness: 0.3 });
        C(s, 0.03, 0.03, 0.02, '#222', x, 0.98, -3.12);
        C(s, 0.025, 0.025, 0.22, '#b0b7bb', x, 1.04, -3.38, { metalness: 0.8, roughness: 0.25 });
        B(s, 0.04, 0.04, 0.16, '#b0b7bb', x, 1.14, -3.3, { metalness: 0.8, roughness: 0.25 });
        B(s, 0.12, 0.025, 0.04, '#8f979b', x, 1.17, -3.38, { metalness: 0.7, roughness: 0.35 });
      });
      const mirror = B(s, 2.8, 0.9, 0.03, '#c6d8de', 0, 1.75, -3.47, { metalness: 0.2, roughness: 0.45 });
      mirror.material.map = canvasTex(256, 128, (g) => { g.fillStyle = '#c6d8de'; g.fillRect(0, 0, 256, 128); grime(g, 256, 128, '#6d7b76', 260, 5); });
      B(s, 0.3, 0.35, 0.2, '#e4e4e4', 2.2, 1.35, -3.38);
      B(s, 0.6, 0.3, 0.01, sign('Pay & Use\n₹5', '#1f5fa8', '#ffffff'), -2.4, 1.9, -3.48);
      C(s, 0.22, 0.18, 0.55, '#5d6b5e', 1.9, 0.28, -3.0, { roughness: 0.9 });
      [[1.6, -2.7], [1.75, -2.55], [0.6, -2.3], [-1.3, -2.8]].forEach(([x, z]) => B(s, 0.12, 0.02, 0.09, '#f1f1ee', x, 0.01, z, {}, rnd(0, 3)));
      const puddle = put(s, new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), mat('#3b4a45', { transparent: true, opacity: 0.45, roughness: 0.05 })), 0.3, 0.005, -2.3);
      puddle.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        B(s, 0.05, 2.0, 1.35, '#6f8d80', -2.1, 1.05, -2.6 + i * 1.5);
        B(s, 0.04, 1.75, 1.15, '#7fa293', -2.08, 0.98, -1.85 + i * 1.5);
        B(s, 0.03, 0.04, 0.12, '#c9a227', -2.04, 1.0, -1.45 + i * 1.5, { metalness: 0.7 });
      }
      door(s, 3.47, 0.8, -Math.PI / 2, '#5b4636');
      B(s, 0.25, 0.06, 0.12, '#e8b23a', 1.3, 0.98, -3.1);
      // a slow drip from the left tap
      const drop = S(s, 0.012, '#bfe3ff', -0.8, 1.1, -3.24, { transparent: true, opacity: 0.8, roughness: 0 });
      return (t) => { const p = (t % 1.7) / 1.7; drop.position.y = 1.1 - p * p * 0.15; drop.visible = p < 0.95; };
    },
  },
  {
    id: 'stove',
    title: 'Home kitchen: the gas stove',
    theme: 'Checking',
    sound: 'kitchen',
    intro: 'Your kitchen in the morning. The stove was turned off after breakfast.',
    steps: [
      { text: 'Look at the gas stove. The knobs are turned off.', focus: [0, 1.0, -3.1], cam: [0, 1.6, 1.3] },
      { text: 'Walk up and look at the knobs once. Do not count or recheck.', focus: [0, 0.99, -2.86], cam: [0, 1.5, -1.6] },
      { text: 'Turn away from the stove, towards the kitchen door.', focus: [3.4, 1.2, 0.5], cam: [0.4, 1.6, -0.6] },
      { text: 'Imagine leaving the house for college without going back to check.', focus: [3.4, 1.2, 0.5], cam: [2.3, 1.6, 0.5] },
      { text: 'Look at the clock. Imagine the whole day passing without checking.', focus: [1.6, 2.2, -3.46], cam: [0, 1.6, 0.6] },
    ],
    build: (s) => {
      room(s, plaster('#efe1c4'), tiles('#c9b79c', '#a08d73', 4, 120, [5, 5]), '#f7f2e8', true);
      B(s, 4, 0.8, 0.02, tiles('#f4f4f0', '#c7c3ba', 6, 40, [3, 1]), 0, 1.35, -3.48);
      B(s, 4, 0.86, 0.62, '#7b5e48', 0, 0.43, -3.17);
      [-1.5, -0.5, 0.5, 1.5].forEach((x) => { B(s, 0.95, 0.75, 0.02, '#8d6d55', x, 0.43, -2.85); B(s, 0.12, 0.02, 0.03, '#d0c5b5', x + 0.3, 0.7, -2.83, { metalness: 0.6 }); });
      B(s, 4, 0.06, 0.7, '#3a3a3a', 0, 0.9, -3.15, { roughness: 0.35 });
      B(s, 1.1, 0.09, 0.52, '#262626', 0, 0.98, -3.14, { roughness: 0.3 });
      [-0.28, 0.28].forEach((x) => {
        const burner = put(s, new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 10, 28), mat('#111', { metalness: 0.5 })), x, 1.04, -3.18);
        burner.rotation.x = Math.PI / 2;
        C(s, 0.05, 0.05, 0.03, '#5a4a3a', x, 1.04, -3.18, { metalness: 0.6 });
        const knob = put(s, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 20), mat('#d9d9d9', { metalness: 0.4 })), x * 1.07, 0.98, -2.86);
        knob.rotation.x = Math.PI / 2;
        B(s, 0.008, 0.045, 0.01, '#222', x * 1.07, 0.98, -2.835);
      });
      C(s, 0.17, 0.17, 0.62, '#c0392b', 1.55, 0.31, -2.7, { roughness: 0.5 });
      C(s, 0.06, 0.08, 0.08, '#8a8a8a', 1.55, 0.66, -2.7, { metalness: 0.6 });
      B(s, 2.4, 0.04, 0.3, '#7b5e48', -0.6, 2.05, -3.33);
      [['#e8c07a', 0.11], ['#c94f3c', 0.09], ['#f2e3b3', 0.1], ['#8fb35a', 0.08], ['#d68a3c', 0.1]].forEach(([c, r], i) => C(s, r as number, r as number, 0.24, c as string, -1.5 + i * 0.42, 2.2, -3.33, { transparent: true, opacity: 0.9, roughness: 0.2 }));
      windowAt(s, -3.48, 1.7, -1, Math.PI / 2);
      door(s, 3.47, 0.5, -Math.PI / 2, '#7a5638');
      clock(s, 1.6, 2.2, -3.47);
      C(s, 0.15, 0.13, 0.12, '#9aa3a8', -0.28, 1.12, -3.18, { metalness: 0.8, roughness: 0.3 });
    },
  },
  {
    id: 'door',
    title: 'Front door lock',
    theme: 'Checking / harm',
    sound: 'hall',
    intro: 'The entrance of your home. You have just locked the front door, once.',
    steps: [
      { text: 'Look at the front door. It has been locked once.', focus: [0, 1.3, -3.4], cam: [0, 1.6, 1.5] },
      { text: 'Walk closer and look at the lock. Notice the doubt: "What if it is not locked?" Let it stay.', focus: [0.34, 1.12, -3.38], cam: [0.2, 1.5, -1.8] },
      { text: 'Turn around and look at the stairs.', focus: [-1.5, 0.9, 2.4], cam: [0, 1.6, 0] },
      { text: 'Imagine walking down the stairs without going back to the door.', focus: [-1.5, 1.6, 3.3], cam: [-1.2, 1.7, 1.3] },
      { text: 'Look back at the door from the stairs. Imagine sitting in class while the doubt is still there.', focus: [0, 1.3, -3.4], cam: [-1.4, 2.1, 2.3] },
    ],
    build: (s) => {
      room(s, plaster('#ddd6ea'), wood('#a17a55', '#7d5a3c', [3, 3]), '#f6f3fb', true);
      door(s, 0, -3.46, 0, '#6b4226', 1.05);
      B(s, 0.1, 0.16, 0.05, '#c9a227', 0.34, 1.12, -3.41, { metalness: 0.85, roughness: 0.25 });
      B(s, 0.16, 0.035, 0.035, '#b8921f', 0.24, 1.25, -3.4, { metalness: 0.85, roughness: 0.25 });
      B(s, 0.9, 0.5, 0.34, '#8a6a4f', -1.7, 0.25, -3.2);
      [[-2, '#2c3e50'], [-1.8, '#c0392b'], [-1.5, '#7f8c8d']].forEach(([x, c]) => B(s, 0.12, 0.08, 0.28, c as string, x as number, 0.54, -3.18));
      B(s, 0.6, 0.75, 0.35, '#7b5e48', 1.6, 0.375, -3.25);
      C(s, 0.14, 0.08, 0.06, '#d8c9a8', 1.6, 0.78, -3.25);
      B(s, 0.05, 0.02, 0.08, '#c9a227', 1.62, 0.8, -3.25, { metalness: 0.9 });
      B(s, 0.5, 0.6, 0.01, sign('NOV\n2026', '#ffffff', '#6b4226', 128, 160), 1.6, 1.7, -3.48);
      B(s, 1.3, 0.02, 0.9, '#9c3d54', 0, 0.01, -2.4);
      for (let i = 0; i < 8; i++) B(s, 1.3, 0.18, 0.32, '#9a9a9a', -1.6, 0.09 + i * 0.18, 1.0 + i * 0.32, { roughness: 0.6 });
      for (let i = 0; i < 8; i++) C(s, 0.015, 0.015, 0.9, '#5a4a3a', -0.95, 0.6 + i * 0.18, 1.0 + i * 0.32);
      const rail = B(s, 0.05, 0.05, 2.9, '#5a4a3a', -0.95, 1.65, 2.1);
      rail.rotation.x = -Math.atan2(0.18, 0.32);
      windowAt(s, 3.48, 1.7, 0.5, -Math.PI / 2);
      clock(s, -3.47, 2.1, -1, Math.PI / 2);
    },
  },
  {
    id: 'knife',
    title: 'Kitchen counter with a knife',
    theme: 'Harm OCD',
    sound: 'kitchen',
    intro: 'Your kitchen before dinner. Vegetables and a knife are on the chopping board.',
    steps: [
      { text: 'Look at the kitchen. A knife is lying on the chopping board.', focus: [0.2, 1.0, -3.0], cam: [0, 1.6, 1.3] },
      { text: 'Walk up and look directly at the knife. Notice the thought "what if I…" and let it stay.', focus: [0.3, 0.99, -2.98], cam: [0.3, 1.45, -1.9] },
      { text: 'Imagine picking up the knife and chopping vegetables for dinner.', focus: [0.1, 0.99, -3.0], cam: [0.2, 1.5, -2.2] },
      { text: 'Look at the doorway. Imagine someone you love walking in while you hold the knife, and you carry on cooking.', focus: [3.4, 1.3, 0.6], cam: [0.6, 1.6, -1.6] },
      { text: 'Look at the knife again and say: "This is the OCD talking. Thoughts are not actions." Stay with the anxiety.', focus: [0.3, 0.99, -2.98], cam: [0.3, 1.5, -2.1] },
    ],
    build: (s) => {
      room(s, plaster('#f3dcc4'), tiles('#d8c3a5', '#b19b7d', 4, 100, [5, 5]), '#fbf5ec', true);
      B(s, 4.5, 0.86, 0.62, '#8b6b52', 0, 0.43, -3.17);
      B(s, 4.5, 0.06, 0.7, '#e9e4dc', 0, 0.9, -3.15, { roughness: 0.35 });
      B(s, 4.5, 0.7, 0.02, tiles('#fbfaf6', '#d8d2c6', 6, 20, [3, 1]), 0, 1.3, -3.48);
      B(s, 0.6, 0.03, 0.38, '#d8b07a', 0.15, 0.945, -3.0);
      const blade = B(s, 0.3, 0.006, 0.045, '#e1e5e8', 0.36, 0.965, -2.96, { metalness: 0.9, roughness: 0.18 }, 0.35);
      blade.castShadow = true;
      B(s, 0.13, 0.024, 0.032, '#2b1d14', 0.13, 0.97, -2.88, {}, 0.35);
      S(s, 0.045, '#d63a2f', -0.05, 0.99, -3.08, { roughness: 0.4 });
      S(s, 0.04, '#d63a2f', 0.03, 0.985, -3.12, { roughness: 0.4 });
      S(s, 0.05, '#c9a3c9', -0.12, 0.995, -2.95, { roughness: 0.5 });
      const carrot = put(s, new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 12), mat('#ef7d22')), 0.32, 0.985, -3.1);
      carrot.rotation.z = Math.PI / 2;
      C(s, 0.16, 0.11, 0.1, '#e6e1d8', -1.0, 0.98, -3.1);
      C(s, 0.15, 0.15, 0.18, '#7d8790', -1.6, 1.02, -3.15, { metalness: 0.7, roughness: 0.3 });
      B(s, 0.8, 1.9, 0.7, '#dfe6ea', 2.85, 0.95, -3.05, { roughness: 0.3 });
      B(s, 0.03, 0.4, 0.03, '#9aa3a8', 2.5, 1.2, -2.68, { metalness: 0.7 });
      const opening = B(s, 0.02, 2.1, 1.0, '#3d3129', 3.48, 1.05, 0.6);
      opening.material.emissive = new THREE.Color('#2a1d12');
      B(s, 0.04, 2.2, 0.08, '#e8e2d6', 3.47, 1.1, 0.06);
      B(s, 0.04, 2.2, 0.08, '#e8e2d6', 3.47, 1.1, 1.14);
      B(s, 0.5, 0.4, 0.02, canvasTex(128, 100, (g) => { g.fillStyle = '#f5e6c8'; g.fillRect(0, 0, 128, 100); g.fillStyle = '#e0a96d'; [[40, 55], [75, 50], [100, 62]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y - 18, 10, 0, 7); g.fill(); g.fillRect(x - 12, y - 6, 24, 40); }); g.strokeStyle = '#8b5a2b'; g.lineWidth = 8; g.strokeRect(0, 0, 128, 100); }), -1.6, 1.9, -3.47);
      windowAt(s, -3.48, 1.7, -1.2, Math.PI / 2);
    },
  },
  {
    id: 'symmetry',
    title: 'A crooked bookshelf',
    theme: 'Symmetry / "just right"',
    sound: 'room',
    intro: 'Your study room. Some things are uneven, and they will stay that way.',
    steps: [
      { text: 'Look at the bookshelf. Some books lean, and the picture frame is tilted.', focus: [0, 1.2, -3.3], cam: [0, 1.6, 1.4] },
      { text: 'Walk closer. Look at the most crooked book. Notice the urge to straighten it.', focus: [-0.79, 0.95, -3.25], cam: [-0.5, 1.5, -1.6] },
      { text: 'Keep looking for one minute without fixing anything.', focus: [-0.79, 0.95, -3.25], cam: [-0.6, 1.4, -2.2] },
      { text: 'Look at the tilted frame and the uneven desk. Imagine leaving the room with everything as it is.', focus: [2.4, 1.6, -3.4], cam: [0.6, 1.6, -0.5] },
      { text: 'Look at the window. Imagine it all staying like this until tomorrow.', focus: [-3.4, 1.7, 0], cam: [0, 1.6, 0.8] },
    ],
    build: (s) => {
      room(s, plaster('#dbe7f2'), wood('#b08a62', '#8a6643', [3, 3]));
      B(s, 2.6, 2.4, 0.4, '#9c6b43', 0, 1.2, -3.28);
      [0.1, 0.85, 1.6, 2.35].forEach((y) => B(s, 2.5, 0.05, 0.38, '#7a5233', 0, y, -3.24));
      const colors = ['#e4572e', '#29335c', '#f3a712', '#669bbc', '#a8c686', '#ff7ab6', '#5c4d7d', '#2a9d8f'];
      [0.13, 0.88, 1.63].forEach((y, row) => {
        let x = -1.15;
        for (let i = 0; i < 13; i++) {
          const h = 0.42 + ((i * 7 + row) % 4) * 0.05;
          const tilt = (i + row) % 5 === 2 ? 0.28 : (i + row) % 7 === 4 ? -0.18 : 0;
          B(s, 0.07, h, 0.26, colors[(i + row * 3) % colors.length], x, y + h / 2, -3.22, {}, 0, tilt);
          x += 0.085 + (i % 4 === 0 ? 0.05 : 0);
        }
      });
      B(s, 0.07, 0.5, 0.26, '#e4572e', -0.79, 0.95 + 0.25, -3.22, {}, 0, 0.45);
      const frame = B(s, 1.0, 0.75, 0.04, canvasTex(160, 120, (g) => { g.fillStyle = '#f5d6a0'; g.fillRect(0, 0, 160, 120); g.fillStyle = '#6aa5d8'; g.fillRect(14, 14, 132, 60); g.fillStyle = '#5c9e4e'; g.fillRect(14, 70, 132, 36); g.strokeStyle = '#7a5233'; g.lineWidth = 12; g.strokeRect(0, 0, 160, 120); }), 2.4, 1.6, -3.46);
      frame.rotation.z = 0.16;
      B(s, 1.4, 0.05, 0.7, '#a1774f', 2.0, 0.75, -2.0, {}, 0.12);
      [[1.6, -1.8], [2.4, -2.2], [1.6, -2.3], [2.4, -1.7]].forEach(([x, z]) => B(s, 0.05, 0.75, 0.05, '#7a5233', x, 0.375, z));
      B(s, 0.3, 0.02, 0.22, '#ffffff', 1.8, 0.79, -2.0, {}, 0.5);
      B(s, 0.3, 0.02, 0.22, '#fff6c4', 2.2, 0.79, -2.1, {}, -0.3);
      C(s, 0.04, 0.04, 0.12, '#3c6e71', 2.5, 0.84, -1.85);
      const rug = put(s, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), mat('#c06c84')), 0.25, 0.006, -0.6);
      rug.rotation.x = -Math.PI / 2;
      rug.rotation.z = 0.2;
      windowAt(s, -3.48, 1.7, 0, Math.PI / 2);
      clock(s, 3.47, 2.2, -1, -Math.PI / 2, 0.2);
    },
  },
  {
    id: 'prayer',
    title: 'A quiet prayer room',
    theme: 'Religious / scrupulosity',
    sound: 'temple',
    intro: 'A small, quiet prayer room at home. The lamp is lit.',
    steps: [
      { text: 'Look around the prayer room: the lamp, the flowers, the place to sit.', focus: [0, 1.1, -3.2], cam: [0, 1.6, 1.4] },
      { text: 'Walk to the mat. Notice any unwanted thought that comes. Do not push it away.', focus: [0, 0.05, -1.6], cam: [0, 1.6, 0] },
      { text: 'Sit down. Imagine an upsetting thought arriving during prayer.', focus: [0.55, 0.95, -3.0], cam: [0, 1.0, -1.4] },
      { text: 'Stay seated without repeating the prayer or asking for forgiveness.', focus: [0, 1.25, -3.3], cam: [0, 1.0, -1.4] },
      { text: 'Say: "This is the OCD, not my faith." Let the doubt stay unanswered.', focus: [0, 1.25, -3.3], cam: [0, 1.0, -1.6] },
    ],
    build: (s) => {
      room(s, plaster('#f7dfbf'), wood('#9b6b43', '#7a4e2c', [3, 3]), '#fbefdc', true);
      B(s, 2.2, 0.85, 0.7, '#7a3b2e', 0, 0.425, -3.1);
      B(s, 2.3, 0.05, 0.75, '#c99a52', 0, 0.875, -3.1);
      const mandala = canvasTex(256, 256, (g) => {
        g.fillStyle = '#7a2e1f'; g.fillRect(0, 0, 256, 256);
        g.translate(128, 128);
        ['#f2c14e', '#e8833a', '#f7e3a1', '#d1495b', '#f2c14e'].forEach((c, i) => {
          g.fillStyle = c;
          for (let k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.beginPath(); g.ellipse(0, 90 - i * 18, 14 - i, 30 - i * 4, 0, 0, Math.PI * 2); g.fill(); }
        });
        g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill();
      });
      B(s, 1.0, 1.0, 0.04, mandala, 0, 1.45, -3.44);
      B(s, 1.12, 1.12, 0.02, '#c99a52', 0, 1.45, -3.46, { metalness: 0.6, roughness: 0.4 });
      C(s, 0.07, 0.05, 0.04, '#b5651d', 0.55, 0.92, -3.0);
      const flame = S(s, 0.022, '#ffb347', 0.55, 0.97, -3.0, { emissive: '#ff8c1a', emissiveIntensity: 2 });
      flame.scale.y = 1.6;
      const fl = new THREE.PointLight('#ffae42', 3, 4, 1.5);
      fl.position.set(0.55, 1.05, -2.95);
      s.add(fl);
      for (let i = 0; i < 14; i++) {
        const a = (i / 13) * Math.PI;
        S(s, 0.035, i % 2 ? '#ff9f1c' : '#ffd23f', Math.cos(a) * 0.55, 1.95 - Math.sin(a) * 0.5 - 0.0, -3.4);
      }
      [-0.5, -0.35].forEach((x) => S(s, 0.05, '#ff7ab6', x, 0.93, -3.0));
      C(s, 0.004, 0.004, 0.3, '#5a3b2a', -0.8, 1.03, -3.05);
      C(s, 0.05, 0.07, 0.09, '#d4af37', 0.85, 0.94, -3.1, { metalness: 0.8, roughness: 0.3 });
      B(s, 1.6, 0.02, 1.0, '#b03a2e', 0, 0.01, -1.6);
      B(s, 1.4, 0.022, 0.8, '#e0a43a', 0, 0.012, -1.6);
      C(s, 0.25, 0.25, 0.1, '#6c3483', 0, 0.06, -1.5);
      windowAt(s, 3.48, 1.8, -0.5, -Math.PI / 2, 0.9, 0.9);
      return (t) => {
        const k = 0.8 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08;
        fl.intensity = 3 * k;
        flame.scale.set(1, 1.5 * k, 1);
      };
    },
  },
];
