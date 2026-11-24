import type { ReactNode } from 'react';
/** Lightweight SVG charts (no chart library), readable in dark and print. */

export function LineChart({ points, max = 10, height = 160, label }: { points: { x: number; y: number }[]; max?: number; height?: number; label?: string }) {
  const w = 520;
  const h = height;
  const pad = 28;
  if (points.length === 0) return <div className="faint" style={{ height }}>No data yet</div>;
  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1);
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX)) * (w - pad * 2);
  const sy = (y: number) => h - pad - (y / max) * (h - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={label ?? 'line chart'}>
      {[0, max / 2, max].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={sy(g)} y2={sy(g)} stroke="#efe1ff" strokeDasharray="4 4" />
          <text x={4} y={sy(g) + 4} fontSize="11" fill="#9a8bb3">{g}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="#7c4dff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="5" fill="#ff4fa0" stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function Bars({ items, max }: { items: { label: string; value: number; hint?: string }[]; max: number }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="spread" style={{ fontSize: '0.88rem' }}>
            <span style={{ textTransform: 'capitalize' }}>{it.label}</span>
            <span className="muted">{it.value}{it.hint ? ` · ${it.hint}` : ''}</span>
          </div>
          <div className="progress"><div style={{ width: `${Math.min(100, (it.value / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Ring({ value, max, children, size = 220 }: { value: number; max: number; children?: ReactNode; size?: number }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1e7ff" strokeWidth="10" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringg)" strokeWidth="10" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        <defs>
          <linearGradient id="ringg"><stop offset="0" stopColor="#ff4fa0" /><stop offset="1" stopColor="#ff8a3d" /></linearGradient>
        </defs>
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}
