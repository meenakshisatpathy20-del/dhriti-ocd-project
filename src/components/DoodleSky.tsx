/**
 * A hand-drawn, happy cosmos behind every screen: ringed planets, wobbly
 * stars, a smiling moon, a comet and twinkling sparkles. Pure SVG, so it is
 * light on low-end phones; calm mode stops all motion.
 */

const ink = '#2b1747';

function Planet({ c1, c2, ring }: { c1: string; c2: string; ring: string }) {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
      <ellipse cx="60" cy="48" rx="54" ry="14" stroke={ring} strokeWidth="5" strokeLinecap="round" strokeDasharray="190 30" transform="rotate(-12 60 48)" />
      <circle cx="60" cy="45" r="28" fill={c1} stroke={ink} strokeWidth="2.5" />
      <path d="M38 36c10 4 22 4 40-2M36 50c14 5 30 4 46-3" stroke={c2} strokeWidth="5" strokeLinecap="round" />
      <path d="M8 52c30 12 74 12 104-8" stroke={ring} strokeWidth="5" strokeLinecap="round" transform="rotate(-12 60 48)" />
    </svg>
  );
}

function Star({ fill, size = 44 }: { fill: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <path d="M22 3.5l5.4 11.6 12.6 1.6-9.3 8.6 2.4 12.5L22 31.6l-11.1 6.2 2.4-12.5L4 16.7l12.6-1.6z" fill={fill} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkle({ fill, size = 26 }: { fill: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26"><path d="M13 1c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill={fill} /></svg>
  );
}

function Moon() {
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" fill="none">
      <path d="M58 12a34 34 0 1 0 16 50A28 28 0 1 1 58 12z" fill="#ffe08a" stroke={ink} strokeWidth="2.5" />
      <path d="M33 47c2 3 6 3 8 0" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="40" r="2.2" fill={ink} />
      <circle cx="43" cy="40" r="2.2" fill={ink} />
      <circle cx="26" cy="48" r="3" fill="#ff9ccc" opacity="0.7" />
    </svg>
  );
}

function Comet() {
  return (
    <svg width="130" height="60" viewBox="0 0 130 60" fill="none">
      <path d="M6 50c30-6 60-18 92-34" stroke="#ff8a3d" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 9" />
      <path d="M20 54c26-4 52-14 78-30" stroke="#ff4fa0" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 10" />
      <circle cx="108" cy="14" r="10" fill="#ffc94d" stroke={ink} strokeWidth="2.5" />
    </svg>
  );
}

function Swirl() {
  return (
    <svg width="90" height="50" viewBox="0 0 90 50" fill="none">
      <path d="M4 40c10-30 30-30 30-12s-16 14-12 0 26-20 34-2 14 10 30-14" stroke="#a777ff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function Heart() {
  return (
    <svg width="34" height="32" viewBox="0 0 34 32" fill="none">
      <path d="M17 29S3 20 3 11a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 9-14 18-14 18z" fill="#ff7ab6" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

const SPARKLES = [
  { top: '12%', left: '30%', c: '#ffc94d', s: 18 }, { top: '22%', left: '72%', c: '#ff4fa0', s: 14 },
  { top: '48%', left: '6%', c: '#a777ff', s: 20 }, { top: '64%', left: '58%', c: '#ff8a3d', s: 16 },
  { top: '80%', left: '22%', c: '#22c3a0', s: 14 }, { top: '36%', left: '92%', c: '#ffc94d', s: 22 },
  { top: '88%', left: '80%', c: '#ff4fa0', s: 18 }, { top: '6%', left: '86%', c: '#a777ff', s: 12 },
];

export function DoodleSky({ calm }: { calm: boolean }) {
  return (
    <div className={`doodle-sky ${calm ? 'calm' : ''}`} aria-hidden>
      <div className="doodle" style={{ top: '7%', right: '6%' }}><Planet c1="#ffb3d9" c2="#ff7ab6" ring="#7c4dff" /></div>
      <div className="doodle" style={{ bottom: '10%', left: '3%' }}><Planet c1="#ffd29e" c2="#ff8a3d" ring="#22c3a0" /></div>
      <div className="doodle" style={{ top: '40%', right: '2%' }}><Moon /></div>
      <div className="doodle" style={{ top: '18%', left: '18%' }}><Star fill="#ffc94d" /></div>
      <div className="doodle" style={{ bottom: '24%', right: '24%' }}><Star fill="#c9b2ff" size={34} /></div>
      <div className="doodle" style={{ top: '70%', left: '40%' }}><Heart /></div>
      <div className="doodle" style={{ top: '30%', left: '48%', opacity: 0.6 }}><Swirl /></div>
      <div className="doodle" style={{ bottom: '4%', right: '40%' }}><Comet /></div>
      {SPARKLES.map((s, i) => (
        <div key={i} className="twinkle" style={{ position: 'absolute', top: s.top, left: s.left, animationDelay: `${i * 0.45}s` }}><Sparkle fill={s.c} size={s.s} /></div>
      ))}
    </div>
  );
}
