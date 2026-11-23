import { portCoord } from '@/lib/shipping';

// Stylized route map: equirectangular projection cropped to the bounding box of the two ports.
export default function RouteMap({ origin, dest, progress = 0, mode = 'SEA', height = 260 }) {
  const a = portCoord(origin) || [30, 30];
  const b = portCoord(dest) || [36, 35];
  const pad = 14;
  let minX = Math.min(a[0], b[0]) - pad, maxX = Math.max(a[0], b[0]) + pad;
  let minY = Math.min(a[1], b[1]) - pad / 1.5, maxY = Math.max(a[1], b[1]) + pad / 1.5;
  // keep a pleasant aspect ratio
  const W = 800, H = 320;
  const spanX = maxX - minX, spanY = maxY - minY;
  if (spanX / spanY > W / H) { const c = (minY + maxY) / 2, s = (spanX * H) / W; minY = c - s / 2; maxY = c + s / 2; }
  else { const c = (minX + maxX) / 2, s = (spanY * W) / H; minX = c - s / 2; maxX = c + s / 2; }
  // RTL-friendly: east on the left is confusing, keep standard map orientation
  const px = (lon) => ((lon - minX) / (maxX - minX)) * W;
  const py = (lat) => ((maxY - lat) / (maxY - minY)) * H;
  const A = [px(a[0]), py(a[1])], B = [px(b[0]), py(b[1])];
  const dist = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const C = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - Math.min(140, dist * 0.35)];
  const t = Math.max(0, Math.min(1, progress / 100));
  const P = [
    (1 - t) ** 2 * A[0] + 2 * (1 - t) * t * C[0] + t ** 2 * B[0],
    (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * C[1] + t ** 2 * B[1],
  ];
  const dx = 2 * (1 - t) * (C[0] - A[0]) + 2 * t * (B[0] - C[0]);
  const dy = 2 * (1 - t) * (C[1] - A[1]) + 2 * t * (B[1] - C[1]);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const path = `M${A[0]} ${A[1]} Q${C[0]} ${C[1]} ${B[0]} ${B[1]}`;

  // dotted background grid
  const dots = [];
  for (let x = 10; x < W; x += 22) for (let y = 10; y < H; y += 22) dots.push([x, y]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-brand-950 to-brand-900" style={{ height }} dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#22b9ec" opacity=".18" />)}
        {/* graticule */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1="0" x2={W} y1={(H / 6) * i} y2={(H / 6) * i} stroke="#22b9ec" strokeOpacity=".06" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} y1="0" y2={H} x1={(W / 8) * i} x2={(W / 8) * i} stroke="#22b9ec" strokeOpacity=".06" />
        ))}
        <path d={path} stroke="#22b9ec" strokeOpacity=".25" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d={path} stroke="#67d5f8" strokeWidth="2" fill="none" className="route-dash" />
        {/* travelled part */}
        <path d={path} stroke="#f5c451" strokeWidth="3" fill="none" pathLength="100" strokeDasharray={`${t * 100} 100`} strokeLinecap="round" />
        {[[A, origin, 'الشحن'], [B, dest, 'الوصول']].map(([p, name, label], i) => (
          <g key={i} transform={`translate(${p[0]} ${p[1]})`}>
            <circle r="14" fill="#22b9ec" opacity=".35" className="pulse-ring" />
            <circle r="6" fill={i ? '#1fa77a' : '#22b9ec'} stroke="#fff" strokeWidth="2" />
            <g transform={`translate(0 ${i ? 24 : -16})`}>
              <rect x="-50" y="-12" width="100" height="22" rx="11" fill="rgba(7,19,31,.75)" stroke="rgba(255,255,255,.15)" />
              <text textAnchor="middle" y="3" fontSize="11" fill="#fff" fontFamily="IBM Plex Sans Arabic, sans-serif">{label}: {name}</text>
            </g>
          </g>
        ))}
        <g transform={`translate(${P[0]} ${P[1]}) rotate(${angle})`}>
          <circle r="16" fill="#f5c451" opacity=".25" className="pulse-ring" />
          {mode === 'AIR' ? (
            <path d="M14 0 L-6 -4 L-10 -12 L-14 -12 L-10 -3 L-14 -2 L-16 -6 L-18 -6 L-17 0 L-18 6 L-16 6 L-14 2 L-10 3 L-14 12 L-10 12 L-6 4 Z" fill="#fff" />
          ) : mode === 'LAND' ? (
            <g><rect x="-14" y="-6" width="18" height="12" rx="2" fill="#f5c451" /><rect x="4" y="-5" width="9" height="10" rx="2" fill="#fff" /></g>
          ) : (
            <path d="M16 0 L8 -6 H-14 L-16 0 L-14 6 H8 Z" fill="#fff" stroke="#f5c451" strokeWidth="1.5" />
          )}
        </g>
      </svg>
      <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur" dir="rtl">
        تقدّم الرحلة {Math.round(progress)}%
      </div>
    </div>
  );
}
