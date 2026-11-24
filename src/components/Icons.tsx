import { useId, type SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24' };

export const Mic = (p: P) => (<svg {...base} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);
export const Star = (p: P) => (<svg {...base} {...p}><path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" /></svg>);
export const Wave = (p: P) => (<svg {...base} {...p}><path d="M3 12h2l2-5 3 10 3-14 3 12 2-3h3" /></svg>);
export const Shield = (p: P) => (<svg {...base} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>);
export const Book = (p: P) => (<svg {...base} {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16" /></svg>);
export const Lotus = (p: P) => (<svg {...base} {...p}><path d="M12 20c-4 0-8-2-9-6 3 0 6 1 9 6zm0 0c4 0 8-2 9-6-3 0-6 1-9 6zm0 0c-2-3-2-9 0-14 2 5 2 11 0 14z" /></svg>);
export const Ladder = (p: P) => (<svg {...base} {...p}><path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" /></svg>);
export const Globe = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>);
export const Journal = (p: P) => (<svg {...base} {...p}><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM9 8h6M9 12h6M9 16h4" /></svg>);
export const Report = (p: P) => (<svg {...base} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
export const Doctor = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="7" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6M12 15v4M10 17h4" /></svg>);
export const User = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>);
export const Flask = (p: P) => (<svg {...base} {...p}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /></svg>);
export const Home = (p: P) => (<svg {...base} {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>);
export const Music = (p: P) => (<svg {...base} {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>);
export const Check = (p: P) => (<svg {...base} {...p}><path d="M5 12l5 5L20 7" /></svg>);
export const Menu = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);

export function Logo(p: P) {
  // Unique gradient id per instance: a shared id breaks when one copy is display:none.
  const id = `lg-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" {...p}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c4dff" /><stop offset="0.55" stopColor="#ff4fa0" /><stop offset="1" stopColor="#ff8a3d" /></linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="#fff" stroke={`url(#${id})`} strokeWidth="2" strokeDasharray="5 3" />
      <path d="M16 5l2.4 8.6L27 16l-8.6 2.4L16 27l-2.4-8.6L5 16l8.6-2.4z" fill={`url(#${id})`} stroke="#2b1747" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
