import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { money, dateTime } from '@/lib/format';
import { PAY_METHODS } from '@/lib/constants';
import AutoPrint from './AutoPrint';

export default async function Receipt({ params, searchParams }) {
  if (!(await getUser())) redirect('/login');
  const inv = await db.invoice.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, items: true, declaration: true, payments: { include: { user: true } } },
  });
  if (!inv) notFound();
  const s = await getSettings();
  const c = inv.currency;

  return (
    <div className="mx-auto my-4 w-[80mm] bg-white p-3 font-mono text-[12px] leading-5 text-black shadow print:my-0 print:shadow-none">
      <AutoPrint auto={!!searchParams?.print} />
      <div className="text-center">
        <div className="text-base font-bold">{s.officeName}</div>
        {s.officeAddress && <div>{s.officeAddress}</div>}
        {s.officePhone && <div dir="ltr">{s.officePhone}</div>}
      </div>
      <div className="my-2 border-y border-dashed border-black py-1">
        <div>رقم: {inv.number}</div>
        <div>التاريخ: {dateTime(inv.createdAt)}</div>
        <div>العميل: {inv.client.name}</div>
        {inv.declaration && <div>المعاملة: {inv.declaration.refNo}</div>}
      </div>
      {inv.items.map((it) => (
        <div key={it.id} className="flex justify-between gap-2">
          <span>{it.description}{it.qty !== 1 ? ` ×${it.qty}` : ''}</span>
          <span className="whitespace-nowrap">{money(it.total, c)}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-dashed border-black pt-1">
        {inv.discount > 0 && <div className="flex justify-between"><span>خصم</span><span>-{money(inv.discount, c)}</span></div>}
        <div className="flex justify-between text-sm font-bold"><span>الإجمالي</span><span>{money(inv.total, c)}</span></div>
        {inv.payments.map((p) => (
          <div key={p.id} className="flex justify-between"><span>مدفوع ({PAY_METHODS[p.method]})</span><span>{money(p.amount, c)}</span></div>
        ))}
        <div className="flex justify-between font-bold"><span>المتبقي</span><span>{money(inv.total - inv.paid, c)}</span></div>
      </div>
      <div className="mt-3 text-center">{s.invoiceFooter}</div>
      {inv.payments[0]?.user && <div className="text-center">الكاشير: {inv.payments[0].user.name}</div>}
      <div className="no-print mt-4 flex gap-2">
        <a href="/pos" className="btn-primary flex-1">بيع جديد</a>
        <a href={`/invoices/${inv.id}`} className="btn-secondary flex-1">الفاتورة</a>
      </div>
    </div>
  );
}
