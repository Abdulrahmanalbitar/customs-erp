'use client';
import { useEffect } from 'react';

export default function AutoPrint({ auto }) {
  useEffect(() => {
    if (auto) setTimeout(() => window.print(), 300);
  }, [auto]);
  return (
    <button type="button" onClick={() => window.print()} className="no-print btn-secondary mb-3 w-full">
      🖨️ طباعة
    </button>
  );
}
