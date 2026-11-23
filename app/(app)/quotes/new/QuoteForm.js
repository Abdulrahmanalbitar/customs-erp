'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { SubmitButton } from '@/components/buttons';
import { money } from '@/lib/format';
import { saveQuote } from '../actions';

export default function QuoteForm({ clients, services, clientId }) {
  const [currency, setCurrency] = useState('USD');
  const [items, setItems] = useState([{ description: '', qty: 1, price: 0 }]);
  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const upd = (i, p) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <form action={saveQuote} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="card grid gap-4 md:grid-cols-3">
        <div><label>العميل *</label>
          <select name="clientId" className="input" required defaultValue={clientId}>
            <option value="">— اختر —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label>العملة</label>
          <select name="currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">دولار</option><option value="SYP">ليرة سورية</option>
          </select>
        </div>
        <div><label>مدة الصلاحية (يوم)</label><input name="validDays" type="number" className="input" defaultValue={15} /></div>
      </div>
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>البنود</h2>
          <select className="input max-w-xs" value="" onChange={(e) => { const s = services.find((x) => String(x.id) === e.target.value); if (s) setItems([...items.filter((i) => i.description), { description: s.name, qty: 1, price: s.price }]); }}>
            <option value="">+ من قائمة الخدمات</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {items.map((it, i) => (
          <div key={i} className="mb-2 grid grid-cols-12 gap-2">
            <input className="input col-span-6" placeholder="الوصف" value={it.description} onChange={(e) => upd(i, { description: e.target.value })} />
            <input className="input col-span-2" type="number" step="any" value={it.qty} onChange={(e) => upd(i, { qty: e.target.value })} />
            <input className="input col-span-3" type="number" step="any" value={it.price} onChange={(e) => upd(i, { price: e.target.value })} />
            <button type="button" className="btn-ghost col-span-1 p-0 text-red-500" onClick={() => setItems(items.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between">
          <button type="button" className="btn-secondary" onClick={() => setItems([...items, { description: '', qty: 1, price: 0 }])}><Plus className="h-4 w-4" /> بند</button>
          <div className="font-display text-xl font-bold">{money(total, currency)}</div>
        </div>
      </div>
      <div className="card"><label>ملاحظات وشروط</label><textarea name="notes" rows={3} className="input" defaultValue="الأسعار لا تشمل أي رسوم إضافية تفرضها الجمارك بعد المعاينة. الرسوم الجمركية تقديرية." /></div>
      <SubmitButton>حفظ العرض</SubmitButton>
    </form>
  );
}
