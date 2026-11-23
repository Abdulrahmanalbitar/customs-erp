// Animated ocean scene: sky, sun, clouds, gulls, port cranes and a container ship sailing across layered waves.
function wavePath(w, h, amp, len, y) {
  let d = `M0 ${y}`;
  for (let x = 0; x <= w * 2; x += len) {
    d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
  }
  return `${d} V ${h} H 0 Z`;
}

function Ship() {
  const colors = ['#e8a91c', '#0a9bd2', '#e2463f', '#1fa77a', '#7c5cff', '#f07c2a'];
  return (
    <g className="ship-bob">
      {/* containers */}
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 7 }).map((__, col) => (
          <rect key={`${row}-${col}`} x={40 + col * 22} y={22 - row * 11} width="20" height="10" rx="1.5" fill={colors[(row * 3 + col) % colors.length]} opacity=".95" />
        ))
      )}
      {/* bridge */}
      <rect x="200" y="0" width="26" height="34" rx="2" fill="#f1f5f9" />
      <rect x="204" y="5" width="18" height="4" rx="1" fill="#0b3550" />
      <rect x="204" y="12" width="18" height="4" rx="1" fill="#0b3550" />
      <rect x="210" y="-12" width="6" height="12" fill="#cbd5e1" />
      <rect x="208" y="-15" width="10" height="4" rx="1" fill="#e2463f" />
      {/* hull */}
      <path d="M10 33 H260 L244 62 H30 Z" fill="#0b2e44" />
      <path d="M10 33 H260 L256 41 H14 Z" fill="#e2463f" />
      <text x="120" y="54" fontSize="9" fill="#9ad8f0" fontFamily="monospace" letterSpacing="2">CUSTOMS·LINE</text>
      {/* wake */}
      <path d="M0 60 q-30 4 -70 2" stroke="#fff" strokeOpacity=".55" strokeWidth="2" fill="none" />
      <path d="M4 63 q-40 6 -95 4" stroke="#fff" strokeOpacity=".3" strokeWidth="2" fill="none" />
    </g>
  );
}

export default function OceanHero({ children }) {
  const W = 1200;
  const H = 300;
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl shadow-glow">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a2b40" />
            <stop offset=".55" stopColor="#10628e" />
            <stop offset="1" stopColor="#22b9ec" />
          </linearGradient>
          <radialGradient id="sun" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fff7d1" />
            <stop offset=".4" stopColor="#f5c451" />
            <stop offset="1" stopColor="#f5c451" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sea1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b7bb0" /><stop offset="1" stopColor="#0a2b40" /></linearGradient>
          <linearGradient id="sea2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a9bd2" /><stop offset="1" stopColor="#10628e" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#sky)" />
        {/* stars */}
        {[[90, 30], [240, 60], [420, 25], [610, 50], [760, 20], [980, 45], [1110, 28], [520, 80]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" fill="#fff" className="star" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
        <circle cx="180" cy="95" r="70" fill="url(#sun)" />
        <circle cx="180" cy="95" r="22" fill="#fff4c2" />
        {/* reflection */}
        <rect x="160" y="190" width="40" height="3" rx="1.5" fill="#fff4c2" className="shimmer" />
        <rect x="150" y="200" width="60" height="3" rx="1.5" fill="#fff4c2" className="shimmer" style={{ animationDelay: '1s' }} />
        {/* clouds */}
        <g className="cloud" style={{ animationDuration: '90s' }}>
          <g fill="#fff" opacity=".18">
            <ellipse cx="1300" cy="70" rx="70" ry="16" /><ellipse cx="1340" cy="60" rx="40" ry="14" />
            <ellipse cx="1650" cy="110" rx="90" ry="14" /><ellipse cx="1990" cy="55" rx="60" ry="12" />
          </g>
        </g>
        <g className="cloud" style={{ animationDuration: '140s' }}>
          <g fill="#fff" opacity=".1">
            <ellipse cx="700" cy="40" rx="110" ry="14" /><ellipse cx="1050" cy="90" rx="80" ry="12" />
          </g>
        </g>
        {/* gulls */}
        {[[520, 70], [548, 82], [880, 60]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} stroke="#e2f6ff" strokeWidth="1.6" fill="none" className="gull" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
        {/* port & cranes on the left (RTL end) */}
        <g opacity=".85">
          <rect x="0" y="180" width="140" height="30" fill="#082232" />
          {[20, 75].map((x) => (
            <g key={x} stroke="#f5c451" strokeWidth="3" fill="none">
              <path d={`M${x} 180 V110 H${x + 55} M${x + 8} 110 L${x} 128 M${x + 40} 110 V130`} />
              <rect x={x + 34} y="130" width="12" height="7" fill="#e2463f" stroke="none" />
            </g>
          ))}
          {[[8, 170, '#0a9bd2'], [30, 170, '#e8a91c'], [52, 170, '#1fa77a'], [19, 160, '#e2463f'], [41, 160, '#7c5cff']].map(([x, y, c], i) => (
            <rect key={i} x={x} y={y} width="20" height="10" rx="1" fill={c} />
          ))}
        </g>
        {/* lighthouse on the right */}
        <g transform="translate(1130 120)">
          <path d="M8 0 h14 l6 80 h-26 Z" fill="#f1f5f9" />
          <rect x="6" y="20" width="18" height="8" fill="#e2463f" /><rect x="4" y="46" width="22" height="8" fill="#e2463f" />
          <rect x="9" y="-10" width="12" height="10" fill="#f5c451" />
          <path d="M15 -5 L-140 -40 L-140 30 Z" fill="#fff4c2" opacity=".08" className="shimmer" />
        </g>
        {/* back waves */}
        <g className="wave" style={{ animationDuration: '22s' }}>
          <path d={wavePath(W, H, 6, 120, 196)} fill="url(#sea1)" opacity=".9" />
        </g>
        {/* ship */}
        <g className="ship-track">
          <g transform="translate(0 150) scale(.95)"><Ship /></g>
        </g>
        {/* front waves */}
        <g className="wave" style={{ animationDuration: '14s' }}>
          <path d={wavePath(W, H, 8, 160, 212)} fill="url(#sea2)" opacity=".85" />
        </g>
        <g className="wave" style={{ animationDuration: '9s' }}>
          <path d={wavePath(W, H, 5, 90, 236)} fill="#0b4f73" opacity=".9" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-l from-ink-900/70 via-ink-900/25 to-transparent" />
      <div className="relative min-h-[260px] p-6 text-white md:p-8">{children}</div>
    </div>
  );
}
