'use client';
import { useRef, useState } from 'react';
import { Sparkles, Upload, LoaderCircle, Wand2, CheckCircle2 } from 'lucide-react';

const FIELD_MAP = { goods: 'goods', hsCode: 'hsCode', origin: 'origin', goodsValue: 'goodsValue', weight: 'weight', packages: 'packages', containerNo: 'containerNo', billOfLading: 'billOfLading' };

function setField(form, name, value) {
  const el = form?.elements?.namedItem(name);
  if (!el || value === undefined || value === null || value === '') return false;
  el.value = value;
  el.classList.add('ring-4', 'ring-fuchsia-200');
  setTimeout(() => el.classList.remove('ring-4', 'ring-fuchsia-200'), 2500);
  return true;
}

export default function AiAssist({ enabled }) {
  const box = useRef(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [hs, setHs] = useState(null);
  const form = () => box.current?.closest('form');

  if (!enabled) {
    if (process.env.STATIC_BUILD) return null; // no server → no AI in the GitHub Pages build
    return (
      <div className="card flex items-center gap-3 border-dashed text-sm text-slate-500">
        <Sparkles className="h-5 w-5 text-fuchsia-500" /> فعّل الذكاء الاصطناعي (ANTHROPIC_API_KEY) لتعبئة البيان تلقائياً من صورة الفاتورة أو البوليصة واقتراح البند الجمركي.
      </div>
    );
  }

  const upload = async (file) => {
    if (!file) return;
    setBusy('doc'); setMsg(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch('/api/ai', { method: 'POST', body: fd });
      const d = await r.json();
      if (!d.data) throw new Error(d.error);
      let n = 0;
      for (const [k, f] of Object.entries(FIELD_MAP)) if (setField(form(), f, d.data[k])) n++;
      if (d.data.currency === 'USD' || d.data.currency === 'SYP') setField(form(), 'currency', d.data.currency);
      setMsg({ ok: true, text: `${d.data.documentType}: تمت تعبئة ${n} حقل. ${d.data.summary || ''}` });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذرت القراءة' });
    } finally { setBusy(''); }
  };

  const suggest = async () => {
    const goods = form()?.elements?.namedItem('goods')?.value;
    const origin = form()?.elements?.namedItem('origin')?.value;
    if (!goods) return setMsg({ ok: false, text: 'اكتب وصف البضاعة أولاً' });
    setBusy('hs'); setHs(null); setMsg(null);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'hs', goods, origin }) });
      const d = await r.json();
      if (!d.data) throw new Error(d.error);
      setHs(d.data);
    } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };

  return (
    <div ref={box} className="relative overflow-hidden rounded-2xl border border-fuchsia-200/70 bg-gradient-to-l from-fuchsia-50 to-brand-50 p-5 dark:border-fuchsia-500/20 dark:from-fuchsia-500/5 dark:to-brand-500/5">
      <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-fuchsia-600" /><h2>المساعد الذكي للبيان</h2></div>
      <div className="flex flex-wrap gap-2">
        <label className="btn mb-0 cursor-pointer bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-white/10 dark:text-slate-100">
          {busy === 'doc' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          اقرأ فاتورة / بوليصة (PDF أو صورة)
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} disabled={!!busy} />
        </label>
        <button type="button" onClick={suggest} disabled={!!busy} className="btn bg-gradient-to-l from-fuchsia-600 to-brand-600 text-white">
          {busy === 'hs' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} اقترح البند الجمركي
        </button>
      </div>
      {msg && <div className={`mt-3 flex items-start gap-2 text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}>{msg.ok && <CheckCircle2 className="mt-0.5 h-4 w-4" />}{msg.text}</div>}
      {hs && (
        <div className="mt-3 space-y-1.5">
          {hs.suggestions.map((s) => (
            <button type="button" key={s.hsCode} onClick={() => setField(form(), 'hsCode', s.hsCode)} className="block w-full rounded-xl bg-white p-2.5 text-right text-sm shadow-sm hover:ring-2 hover:ring-fuchsia-300 dark:bg-white/5">
              <span className="chip ml-2">{s.hsCode}</span><b>{s.description}</b> <span className="text-xs text-slate-500">· ثقة {s.confidence}</span>
              <div className="text-xs text-slate-500">{s.reason}</div>
            </button>
          ))}
          {hs.requiredDocs?.length > 0 && <div className="text-xs"><b>مستندات متوقعة:</b> {hs.requiredDocs.join('، ')}</div>}
          {hs.notes && <div className="text-xs text-slate-600 dark:text-slate-400">{hs.notes}</div>}
        </div>
      )}
    </div>
  );
}
