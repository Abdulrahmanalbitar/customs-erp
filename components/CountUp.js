'use client';
import { useEffect, useState } from 'react';

/** Counts a number up on first render. `format` receives the current value. */
export default function CountUp({ value, prefix = '', suffix = '', decimals = 0, duration = 900 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return; }
    let raf, start;
    const step = (ts) => {
      start ??= ts;
      const p = Math.min(1, (ts - start) / duration);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <bdi className="num">
      {prefix}{v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </bdi>
  );
}
