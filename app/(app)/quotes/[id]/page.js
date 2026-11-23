import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileSignature, Receipt } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PageHeader, Badge, Options } from '@/components/ui';
import { SubmitButton, PrintButton } from '@/components/buttons';
import { money, date } from '@/lib/format';
import { QUOTE_STATUS } from '@/lib/constants';
import { setQuoteStatus, convertQuote } from '../actions';

export default async function QuotePage({ params }) {
  const user = await requireAccess('quotes');
  const q = await db.quote.findUnique({ where: { id: Number(params.id) }, include: { client: true, items: true } });
  if (!q) notFound();
  const s = await getSettings();
  return (
    <>
      <PageHeader title={`عرض سعر ${q.number}`} subtitle={<Badge map={QUOTE_STATUS} value={q.status} />} icon={FileSignature}>
        <PrintButton />
        {q.invoiceId ? (
          <Link href={`/invoices/${q.invoiceId}`} className="btn-secondary"><Receipt className="h-4 w-4" /> الفاتورة</Link>
        ) : can(user, 'invoices') && (
          <form action={convertQuote}><input type="hidden" name="id" value={q.id} /><SubmitButton className="btn-success" confirm="تحويل العرض إلى فاتورة؟"><Receipt className="h-4 w-4" /> تحويل لفاتورة</SubmitButton></form>
        )}
        {!q.invoiceId && (
          <form action={setQuoteStatus} className="flex gap-2">
            <input type="hidden" name="id" value={q.id} />
            <select name="status" className="input py-2" defaultValue={q.status}><Options map={QUOTE_STATUS} /></select>
            <SubmitButton className="btn-secondary">تحديث</SubmitButton>
          </form>
        )}
      </PageHeader>
      <div className="card mx-auto max-w-3xl">
        <div className="mb-6 flex justify-between border-b pb-4 dark:border-white/10">
          <div>
            <div className="font-display text-xl font-bold text-brand-800 dark:text-brand-300">{s.officeName}</div>
            <div className="text-sm text-slate-500">{s.officeAddress}</div>
            <div className="text-sm text-slate-500" dir="ltr">{s.officePhone}</div>
          </div>
          <div className="text-left">
            <div className="font-display text-2xl font-bold">عرض سعر</div>
            <div className="font-mono">{q.number}</div>
            <div className="text-sm">التاريخ: {date(q.createdAt)}</div>
            <div className="text-sm">صالح حتى: {date(q.validUntil)}</div>
          </div>
        </div>
        <div className="mb-4 text-sm">السادة: <b>{q.client.name}</b> المحترمين</div>
        <table className="table mb-4">
          <thead><tr><th>#</th><th>البيان</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
          <tbody>
            {q.items.map((it, i) => (
              <tr key={it.id}><td>{i + 1}</td><td>{it.description}</td><td>{it.qty}</td><td>{money(it.price, q.currency)}</td><td>{money(it.qty * it.price, q.currency)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end"><div className="rounded-xl bg-brand-50 px-6 py-3 text-lg font-bold text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">الإجمالي: {money(q.total, q.currency)}</div></div>
        {q.notes && <div className="mt-6 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{q.notes}</div>}
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-sm text-slate-500"><div className="border-t pt-2">توقيع المكتب</div><div className="border-t pt-2">موافقة العميل</div></div>
      </div>
    </>
  );
}
