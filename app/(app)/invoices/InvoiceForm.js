'use client';
import { useMemo, useState } from 'react';
import { SubmitButton } from '@/components/buttons';
import { money } from '@/lib/format';
import { CURRENCIES, PAY_METHODS } from '@/lib/constants';
import { saveInvoice } from './actions';

export default function InvoiceForm({ clients, services, declarations, initial }) {
  const [clientId, setClientId] = useState(initial.clientId || '');
  const [declarationId, setDeclarationId] = useState(initial.declarationId || '');
  const [currency, setCurrency] = useState(initial.currency || 'USD');
  const [items, setItems] = useState(initial.items?.length ? initial.items : [{ description: '', kind: 'SERVICE', qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [paidNow, setPaidNow] = useState(0);

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const total = Math.max(subtotal - (Number(discount) || 0), 0);
  const clientDecls = useMemo(() => declarations.filter((d) => String(d.clientId) === String(clientId)), [declarations, clientId]);

  const update = (idx, patch) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addService = (id) => {
    const s = services.find((x) => String(x.id) === id);
    if (s) setItems([...items.filter((i) => i.description), { description: s.name, kind: 'SERVICE', qty: 1, price: s.price }]);
  };

  return (
    <form action={saveInvoice} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="card grid gap-4 md:grid-cols-3">
        <div>
          <label>العميل *</label>
          <select name="clientId" className="input" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— اختر —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label>المعاملة الجمركية</label>
          <select name="declarationId" className="input" value={declarationId} onChange={(e) => setDeclarationId(e.target.value)}>
            <option value="">— بدون —</option>
            {clientDecls.map((d) => <option key={d.id} value={d.id}>{d.refNo} {d.goods ? `– ${d.goods}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label>العملة</label>
          <select name="currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>البنود</h2>
          <select className="input max-w-xs" value="" onChange={(e) => addService(e.target.value)}>
            <option value="">+ إضافة خدمة من القائمة</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.price, s.currency)})</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>الوصف</th><th>النوع</th><th className="w-24">الكمية</th><th className="w-36">السعر</th><th>المجموع</th><th></th></tr></thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td><input className="input" value={it.description} onChange={(e) => update(idx, { description: e.target.value })} /></td>
                  <td>
                    <select className="input" value={it.kind} onChange={(e) => update(idx, { kind: e.target.value })}>
                      <option value="SERVICE">أتعاب / خدمة</option>
                      <option value="DISBURSEMENT">مصروف مسترد</option>
                    </select>
                  </td>
                  <td><input type="number" step="any" className="input" value={it.qty} onChange={(e) => update(idx, { qty: e.target.value })} /></td>
                  <td><input type="number" step="any" className="input" value={it.price} onChange={(e) => update(idx, { price: e.target.value })} /></td>
                  <td className="whitespace-nowrap font-semibold">{money((Number(it.qty) || 0) * (Number(it.price) || 0), currency)}</td>
                  <td><button type="button" className="text-red-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn-secondary mt-3" onClick={() => setItems([...items, { description: '', kind: 'SERVICE', qty: 1, price: 0 }])}>+ بند</button>
      </div>

      <div className="card grid gap-4 md:grid-cols-4">
        <div><label>الخصم</label><input name="discount" type="number" step="any" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
        <div><label>المدفوع الآن</label><input name="paidNow" type="number" step="any" className="input" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} /></div>
        <div>
          <label>طريقة الدفع</label>
          <select name="method" className="input">{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div className="rounded-lg bg-brand-50 p-3 text-sm">
          <div className="flex justify-between"><span>المجموع</span><b>{money(subtotal, currency)}</b></div>
          <div className="flex justify-between"><span>الإجمالي</span><b className="text-lg text-brand-700">{money(total, currency)}</b></div>
          <div className="flex justify-between"><span>المتبقي</span><b className="text-red-700">{money(Math.max(total - (Number(paidNow) || 0), 0), currency)}</b></div>
        </div>
        <div className="md:col-span-4"><label>ملاحظات</label><input name="notes" className="input" /></div>
      </div>
      <SubmitButton>حفظ الفاتورة</SubmitButton>
    </form>
  );
}
