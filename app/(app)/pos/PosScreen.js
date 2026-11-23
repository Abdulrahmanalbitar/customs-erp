'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';
import { PAY_METHODS } from '@/lib/constants';
import { posCheckout } from '../invoices/actions';

export default function PosScreen({ services, clients, declarations, rate, defaultCurrency }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [currency, setCurrency] = useState(defaultCurrency || 'USD');
  const [cart, setCart] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientQ, setClientQ] = useState('');
  const [declarationId, setDeclarationId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('CASH');
  const [paid, setPaid] = useState('');
  const [error, setError] = useState('');
  const [custom, setCustom] = useState({ description: '', price: '' });

  // convert a service price to the selected currency
  const conv = (price, from) => (from === currency ? price : from === 'USD' ? price * rate : price / rate);

  const add = (s) => {
    const price = Math.round(conv(s.price, s.currency) * 100) / 100;
    setCart((c) => {
      const ex = c.find((x) => x.key === `s${s.id}`);
      if (ex) return c.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { key: `s${s.id}`, description: s.name, kind: 'SERVICE', qty: 1, price }];
    });
  };
  const addCustom = () => {
    if (!custom.description || !Number(custom.price)) return;
    setCart([...cart, { key: `c${Date.now()}`, description: custom.description, kind: 'SERVICE', qty: 1, price: Number(custom.price) }]);
    setCustom({ description: '', price: '' });
  };

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const total = Math.max(subtotal - (Number(discount) || 0), 0);
  const paidNum = paid === '' ? total : Number(paid) || 0;
  const change = paidNum - total;

  const filteredClients = useMemo(() => {
    const q = clientQ.trim();
    return q ? clients.filter((c) => c.name.includes(q) || (c.phone || '').includes(q)) : clients;
  }, [clients, clientQ]);
  const clientDecls = declarations.filter((d) => String(d.clientId) === String(clientId));

  const checkout = () => {
    setError('');
    if (!clientId) return setError('اختر العميل');
    if (!cart.length) return setError('السلة فارغة');
    start(async () => {
      const r = await posCheckout({ clientId, declarationId, currency, discount, items: cart, paid: Math.min(paidNum, total), method });
      if (r.ok) router.push(`/receipt/${r.id}?print=1`);
      else setError(r.error);
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1>نقطة البيع</h1>
          <div className="flex rounded-lg border bg-white p-1 text-sm">
            {['USD', 'SYP'].map((c) => (
              <button key={c} onClick={() => { setCurrency(c); setCart([]); }} className={`rounded-md px-4 py-1.5 font-semibold ${currency === c ? 'bg-brand-600 text-white' : ''}`}>
                {c === 'USD' ? 'دولار $' : 'ليرة ل.س'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((s) => (
            <button key={s.id} onClick={() => add(s)} className="card flex min-h-[96px] flex-col justify-between p-4 text-right transition hover:border-brand-500 hover:shadow-md active:scale-95">
              <span className="font-semibold">{s.name}</span>
              <span className="mt-2 font-bold text-brand-700">{money(conv(s.price, s.currency), currency)}</span>
            </button>
          ))}
        </div>
        <div className="card mt-4 flex flex-wrap items-end gap-2">
          <div className="flex-1"><label>خدمة أخرى</label><input className="input" value={custom.description} onChange={(e) => setCustom({ ...custom, description: e.target.value })} /></div>
          <div className="w-32"><label>السعر</label><input type="number" className="input" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} /></div>
          <button className="btn-secondary" onClick={addCustom}>إضافة</button>
        </div>
      </div>

      <div className="card flex flex-col xl:col-span-2">
        <div className="mb-3 grid gap-2">
          <input className="input" placeholder="🔍 بحث عن عميل بالاسم أو الهاتف" value={clientQ} onChange={(e) => setClientQ(e.target.value)} />
          <select className="input" value={clientId} onChange={(e) => { setClientId(e.target.value); setDeclarationId(''); }}>
            <option value="">— اختر العميل —</option>
            {filteredClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {clientDecls.length > 0 && (
            <select className="input" value={declarationId} onChange={(e) => setDeclarationId(e.target.value)}>
              <option value="">— ربط بمعاملة (اختياري) —</option>
              {clientDecls.map((d) => <option key={d.id} value={d.id}>{d.refNo} {d.goods ? `– ${d.goods}` : ''}</option>)}
            </select>
          )}
        </div>

        <div className="min-h-[160px] flex-1 divide-y overflow-y-auto">
          {cart.map((i) => (
            <div key={i.key} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex-1">
                <div className="font-semibold">{i.description}</div>
                <div className="text-xs text-slate-500">{money(i.price, currency)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button className="h-7 w-7 rounded bg-slate-100" onClick={() => setCart(cart.map((x) => (x === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>−</button>
                <span className="w-6 text-center">{i.qty}</span>
                <button className="h-7 w-7 rounded bg-slate-100" onClick={() => setCart(cart.map((x) => (x === i ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
              </div>
              <div className="w-24 text-left font-bold">{money(i.qty * i.price, currency)}</div>
              <button className="text-red-500" onClick={() => setCart(cart.filter((x) => x !== i))}>✕</button>
            </div>
          ))}
          {!cart.length && <div className="py-10 text-center text-sm text-slate-400">اضغط على خدمة لإضافتها</div>}
        </div>

        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>المجموع</span><span>{money(subtotal, currency)}</span></div>
          <div className="flex items-center justify-between"><span>الخصم</span><input type="number" className="input w-28 py-1" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div className="flex justify-between text-xl font-bold text-brand-900"><span>الإجمالي</span><span>{money(total, currency)}</span></div>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(PAY_METHODS).map(([k, v]) => (
              <button key={k} onClick={() => setMethod(k)} className={`rounded-md border py-1.5 text-xs font-semibold ${method === k ? 'border-brand-600 bg-brand-50 text-brand-700' : ''}`}>{v}</button>
            ))}
          </div>
          <div className="flex items-center justify-between"><span>المبلغ المستلم</span><input type="number" className="input w-36 py-1" placeholder={String(total)} value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          {change > 0 && <div className="flex justify-between font-bold text-emerald-700"><span>الباقي للعميل</span><span>{money(change, currency)}</span></div>}
          {change < 0 && <div className="flex justify-between font-bold text-amber-700"><span>يُسجَّل ديناً على العميل</span><span>{money(-change, currency)}</span></div>}
          {error && <div className="rounded bg-red-50 p-2 text-red-700">{error}</div>}
          <button onClick={checkout} disabled={pending} className="btn-success w-full py-3 text-base">{pending ? '...جارٍ الحفظ' : '✓ إتمام البيع وطباعة الإيصال'}</button>
        </div>
      </div>
    </div>
  );
}
