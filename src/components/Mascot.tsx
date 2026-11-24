/**
 * Tara, Dhriti's companion star: a friendly hand-drawn character that blinks,
 * bobs, listens and celebrates. Pure SVG + CSS, so it is light on any phone.
 */
export type Mood = 'happy' | 'listening' | 'calm' | 'proud';

export function Mascot({ mood = 'happy', size = 120 }: { mood?: Mood; size?: number }) {
  const mouth = mood === 'proud' ? 'M44 64 Q60 80 76 64' : mood === 'calm' ? 'M48 66 Q60 72 72 66' : mood === 'listening' ? 'M54 66 Q60 70 66 66' : 'M46 64 Q60 76 74 64';
  return (
    <svg className={`mascot mascot-${mood}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Tara, Dhriti's star companion">
      <defs>
        <linearGradient id="tara-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#ffb36b" />
          <stop offset="1" stopColor="#ff7ab6" />
        </linearGradient>
      </defs>
      <g className="mascot-body">
        <path d="M60 6c5 0 8 20 14 26s26 6 28 11-14 17-16 25 6 29 1 32-21-12-27-12-22 15-27 12 3-24 1-32S10 48 12 43s22-5 28-11S55 6 60 6z" fill="url(#tara-body)" stroke="#2b1747" strokeWidth="3" strokeLinejoin="round" />
        <g className="mascot-eyes">
          {mood === 'calm' ? (
            <>
              <path d="M44 52 Q49 56 54 52" stroke="#2b1747" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M66 52 Q71 56 76 52" stroke="#2b1747" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx="49" cy="52" rx="4.5" ry="6" fill="#2b1747" />
              <ellipse cx="71" cy="52" rx="4.5" ry="6" fill="#2b1747" />
              <circle cx="50.5" cy="49.5" r="1.6" fill="#fff" />
              <circle cx="72.5" cy="49.5" r="1.6" fill="#fff" />
            </>
          )}
        </g>
        <circle cx="40" cy="62" r="5" fill="#ff7ab6" opacity="0.55" />
        <circle cx="80" cy="62" r="5" fill="#ff7ab6" opacity="0.55" />
        <path d={mouth} stroke="#2b1747" strokeWidth="3" fill={mood === 'proud' ? '#ff4fa0' : 'none'} strokeLinecap="round" />
      </g>
      {mood === 'listening' && (
        <g className="mascot-waves" stroke="#7c4dff" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M100 40 q6 8 0 16" />
          <path d="M107 34 q10 14 0 28" />
        </g>
      )}
      {mood === 'proud' && (
        <g className="mascot-sparks" fill="#ffc94d">
          <path d="M14 14l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
          <path d="M104 12l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" />
        </g>
      )}
    </svg>
  );
}

/** A burst of stars and confetti for small wins (resisting or delaying a compulsion). */
export function Celebrate() {
  const bits = Array.from({ length: 18 }, (_, i) => i);
  const colors = ['#ff4fa0', '#ff8a3d', '#ffc94d', '#7c4dff', '#22c3a0'];
  return (
    <div className="celebrate" aria-hidden>
      {bits.map((i) => (
        <span key={i} style={{ ['--a' as string]: `${(i / bits.length) * 360}deg`, ['--d' as string]: `${70 + (i % 4) * 18}px`, background: colors[i % colors.length], animationDelay: `${(i % 6) * 0.03}s` }} className={i % 3 === 0 ? 'star' : ''} />
      ))}
    </div>
  );
}
