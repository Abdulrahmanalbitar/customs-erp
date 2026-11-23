'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, RotateCw, LoaderCircle, ArrowLeft } from 'lucide-react';
import { useT } from './LangProvider';

/** Glassy "today's brief" panel: rule-based summary, refreshable with an AI-written one. */
export default function TodayBrief({ text, ai }) {
  const { t } = useT();
  const [brief, setBrief] = useState(text);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'brief' }) });
      const d = await r.json();
      if (d.reply) setBrief(d.reply);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15)] backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"><Sparkles className="h-4 w-4" /></span>
        <b className="flex-1">{t('ملخص اليوم', "Today's brief")}</b>
        {ai && (
          <button onClick={refresh} disabled={busy} className="rounded-lg p-1.5 hover:bg-white/10" title={t('ملخص بالذكاء الاصطناعي', 'AI summary')}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          </button>
        )}
      </div>
      <p className="whitespace-pre-line text-[14.5px] leading-7 text-white/90">{brief}</p>
      <Link href="/assistant" className="mt-3 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
        {t('اسأل المساعد', 'Ask the assistant')} <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
      </Link>
    </div>
  );
}
