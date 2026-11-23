'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, LoaderCircle, FileSignature, Info } from 'lucide-react';
import { money } from '@/lib/format';
import { createQuoteFromCalc } from '../quotes/actions';

const n = (v) => Number(String(v).replace(/,/g, '')) || 0;

export default function DutyCalculator({ rates, clients, services, rate: fx0, canQuote, ai }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    goods: '', hs: '', fob: '', freight: '', insurance: '', insPct: '0.5', dutyRate: '', otherRate: '',
    portFees: '', transport: '', officeFee: services.find((s) => s.name.includes('حاوية'))?.price || 150, fx: fx0, clientId: '',
  });
  const [hsAi, setHsAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickHs = (code) => {
    const r = rates.find((x) => x.hsCode === code);
    setF({ ...f, hs: code, dutyRate: r ? r.dutyRate : f.dutyRate, otherRate: r ? r.otherRate : f.otherRate, goods: f.goods || r?.description || '' });
  };

  const c = useMemo(() => {
    const fob = n(f.fob), freight = n(f.freight);
    const insurance = f.insurance !== '' ? n(f.insurance) : ((fob + freight) * n(f.insPct)) / 100;
    const cif = fob + freight + insurance;
    const duty = (cif * n(f.dutyRate)) / 100;
    const other = ((cif + duty) * n(f.otherRate)) / 100;
    const taxes = duty + other;
    const extras = n(f.portFees) + n(f.transport);
    const office = n(f.officeFee);
    const total = taxes + extras + office;
    return { fob, freight, insurance, cif, duty, other, taxes, extras, office, total, landed: cif + total };
  }, [f]);

  const suggest = async () => {
    if (!f.goods.trim()) return;
    setBusy(true); setHsAi(null);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'hs', goods: f.goods }) });
      const d = await r.json();
      setHsAi(d.data || { error: d.error });
    } finally { setBusy(false); }
  };

  const toQuote = () => {
    if (!f.clientId) return alert('اختر العميل أولاً');
    start(async () => {
      const r = await createQuoteFromCalc({
        clientId: f.clientId,
        notes: `${f.goods || 'بضاعة'}${f.hs ? ` · بند ${f.hs}` : ''} · القيمة الجمركية CIF: ${money(c.cif)} — الرسوم تقديرية وتخضع لتسعير الجمارك`,
        items: [
          { description: `رسوم جمركية تقديرية (${f.dutyRate || 0}%)`, qty: 1, price: +c.duty.toFixed(2) },
          { description: `رسوم ونفقات أخرى (${f.otherRate || 0}%)`, qty: 1, price: +c.other.toFixed(2) },
          { description: 'رسوم مرفأ وأرضيات', qty: 1, price: n(f.portFees) },
          { description: 'نقل', qty: 1, price: n(f.transport) },
          { description: 'أتعاب التخليص الجمركي', qty: 1, price: c.office },
        ].filter((i) => i.price > 0),
      });
      if (r?.id) router.push(`/quotes/${r.id}`);
    });
  };

  const Row = ({ k, v, bold, sub }) => (
    <div className={`flex justify-between py-1.5 ${bold ? 'border-t border-white/15 pt-3 text-lg font-bold' : 'text-sm'}`}>
      <span className={sub ? 'text-white/60' : ''}>{k}</span><span>{money(v)}</span>
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <div className="card grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2">البضاعة والبند الجمركي</h2>
          <div className="md:col-span-2">
            <label>وصف البضاعة</label>
            <div className="flex gap-2">
              <input className="input" value={f.goods} onChange={set('goods')} placeholder="مثال: ألواح طاقة شمسية 550 واط" />
              {ai && <button type="button" onClick={suggest} disabled={busy} className="btn bg-gradient-to-l from-fuchsia-600 to-brand-600 text-white">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} اقترح البند</button>}
            </div>
          </div>
          {hsAi && (
            <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 text-sm dark:border-fuchsia-500/20 dark:bg-fuchsia-500/5 md:col-span-2">
              {hsAi.error ? <span className="text-red-600">{hsAi.error}</span> : (
                <>
                  <div className="mb-2 font-semibold">اقتراحات الذكاء الاصطناعي (استرشادية):</div>
                  {hsAi.suggestions.map((s) => (
                    <button key={s.hsCode} type="button" onClick={() => pickHs(s.hsCode)} className="mb-1.5 block w-full rounded-lg bg-white p-2 text-right hover:ring-2 hover:ring-fuchsia-300 dark:bg-white/5">
                      <span className="chip ml-2">{s.hsCode}</span><b>{s.description}</b> <span className="text-xs text-slate-500">· ثقة {s.confidence}</span>
                      <div className="text-xs text-slate-500">{s.reason}</div>
                    </button>
                  ))}
                  {hsAi.requiredDocs?.length > 0 && <div className="mt-2 text-xs"><b>مستندات متوقعة:</b> {hsAi.requiredDocs.join('، ')}</div>}
                  {hsAi.notes && <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hsAi.notes}</div>}
                </>
              )}
            </div>
          )}
          <div>
            <label>البند الجمركي (HS)</label>
            <input className="input font-mono" list="hslist" value={f.hs} onChange={(e) => pickHs(e.target.value)} dir="ltr" />
            <datalist id="hslist">{rates.map((r) => <option key={r.id} value={r.hsCode}>{r.description}</option>)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label>نسبة الرسم الجمركي %</label><input className="input" type="number" step="any" value={f.dutyRate} onChange={set('dutyRate')} /></div>
            <div><label>رسوم أخرى %</label><input className="input" type="number" step="any" value={f.otherRate} onChange={set('otherRate')} /></div>
          </div>
        </div>
        <div className="card grid gap-4 md:grid-cols-3">
          <h2 className="md:col-span-3">القيمة ($)</h2>
          <div><label>قيمة البضاعة FOB</label><input className="input" type="number" step="any" value={f.fob} onChange={set('fob')} /></div>
          <div><label>أجور الشحن</label><input className="input" type="number" step="any" value={f.freight} onChange={set('freight')} /></div>
          <div>
            <label>التأمين (أو نسبة %)</label>
            <div className="flex gap-1">
              <input className="input" type="number" step="any" value={f.insurance} onChange={set('insurance')} placeholder="تلقائي" />
              <input className="input w-20" type="number" step="any" value={f.insPct} onChange={set('insPct')} title="نسبة التأمين %" />
            </div>
          </div>
          <div><label>رسوم مرفأ وأرضيات</label><input className="input" type="number" step="any" value={f.portFees} onChange={set('portFees')} /></div>
          <div><label>نقل داخلي</label><input className="input" type="number" step="any" value={f.transport} onChange={set('transport')} /></div>
          <div><label>أتعاب المكتب</label><input className="input" type="number" step="any" value={f.officeFee} onChange={set('officeFee')} /></div>
          <div><label>سعر الصرف (ل.س / $)</label><input className="input" type="number" step="any" value={f.fx} onChange={set('fx')} /></div>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          النتائج تقديرية لأغراض التسعير. النسب في الجدول قابلة للتعديل من الإعدادات، ويجب مطابقتها مع التعرفة الجمركية الرسمية النافذة وقرارات التسعير.
        </div>
      </div>

      <div className="xl:col-span-2">
        <div className="sticky top-24 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 p-6 text-white shadow-glow">
          <div className="mb-4 text-sm text-white/70">النتيجة</div>
          <Row k="FOB" v={c.fob} sub /><Row k="الشحن" v={c.freight} sub /><Row k="التأمين" v={c.insurance} sub />
          <Row k="القيمة الجمركية CIF" v={c.cif} />
          <div className="my-2 h-px bg-white/10" />
          <Row k="الرسم الجمركي" v={c.duty} sub /><Row k="رسوم أخرى" v={c.other} sub />
          <Row k="مجموع الرسوم والضرائب" v={c.taxes} />
          <Row k="مرفأ ونقل" v={c.extras} sub /><Row k="أتعاب المكتب" v={c.office} sub />
          <Row k="المطلوب من العميل" v={c.total} bold />
          <div className="text-left text-sm text-gold-400">{money(c.total * n(f.fx), 'SYP')}</div>
          <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
            <div className="flex justify-between"><span>التكلفة الواصلة للبضاعة</span><b>{money(c.landed)}</b></div>
            <div className="flex justify-between text-white/60"><span>نسبة الأعباء من FOB</span><span>{c.fob ? ((c.total / c.fob) * 100).toFixed(1) : 0}%</span></div>
          </div>
          {canQuote && (
            <div className="mt-5 space-y-2">
              <select className="input border-white/20 bg-white/10 text-white" value={f.clientId} onChange={set('clientId')}>
                <option value="" className="text-black">— اختر العميل لعرض السعر —</option>
                {clients.map((x) => <option key={x.id} value={x.id} className="text-black">{x.name}</option>)}
              </select>
              <button onClick={toQuote} disabled={pending} className="btn w-full bg-gold-400 font-bold text-ink-900 hover:bg-gold-500">
                <FileSignature className="h-4 w-4" /> {pending ? '...' : 'إنشاء عرض سعر'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
