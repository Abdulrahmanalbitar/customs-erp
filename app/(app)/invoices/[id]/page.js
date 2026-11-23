import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PageHeader, Badge, LinkButton, Options } from '@/components/ui';
import { SubmitButton, PrintButton } from '@/components/buttons';
import { money, date, dateTime } from '@/lib/format';
import { INVOICE_STATUS, PAY_METHODS } from '@/lib/constants';
import { recordPayment, removePayment, cancelInvoice } from '../actions';

export default async function InvoicePage({ params, searchParams }) {
  const user = await requireAccess('invoices');
  const inv = await db.invoice.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, declaration: true, items: true, payments: { include: { user: true }, orderBy: { id: 'asc' } } },
  });
  if (!inv) notFound();
  const s = await getSettings();
  const due = inv.total - inv.paid;

  return (
    <>
      <PageHeader title={`فاتورة ${inv.number}`}>
        <PrintButton>طباعة A4</PrintButton>
        <LinkButton kind="secondary" href={`/receipt/${inv.id}`}>إيصال حراري</LinkButton>
        {can(user, 'accounting') && inv.status !== 'VOID' && (
          <form action={cancelInvoice}>
            <input type="hidden" name="id" value={inv.id} />
            <SubmitButton className="btn-danger" confirm="إلغاء الفاتورة وعكس قيودها؟">إلغاء الفاتورة</SubmitButton>
          </form>
        )}
      </PageHeader>
      {searchParams?.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 no-print">{searchParams.error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-6 flex flex-wrap justify-between gap-4 border-b pb-4">
            <div>
              <div className="text-xl font-bold text-brand-900">{s.officeName}</div>
              <div className="text-sm text-slate-500">{s.officeAddress}</div>
              <div className="text-sm text-slate-500" dir="ltr">{s.officePhone}</div>
              {s.licenseNo && <div className="text-sm text-slate-500">رقم الترخيص: {s.licenseNo}</div>}
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold">فاتورة</div>
              <div className="font-mono">{inv.number}</div>
              <div className="text-sm">{date(inv.createdAt)}</div>
              <Badge map={INVOICE_STATUS} value={inv.status} />
            </div>
          </div>
          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-slate-500">العميل: </span><b>{inv.client.name}</b></div>
            {inv.client.taxNumber && <div><span className="text-slate-500">رقم بطاقة المستورد: </span>{inv.client.taxNumber}</div>}
            {inv.declaration && (
              <div><span className="text-slate-500">المعاملة: </span><Link className="link" href={`/declarations/${inv.declaration.id}`}>{inv.declaration.refNo}</Link>{inv.declaration.declNo && ` – بيان ${inv.declaration.declNo}`}</div>
            )}
          </div>
          <table className="table mb-4">
            <thead><tr><th>#</th><th>البيان</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={it.id}>
                  <td>{i + 1}</td>
                  <td>{it.description}{it.kind === 'DISBURSEMENT' && <span className="mr-2 text-xs text-slate-400">(مصروف مسترد)</span>}</td>
                  <td>{it.qty}</td>
                  <td>{money(it.price, inv.currency)}</td>
                  <td>{money(it.total, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mr-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span>المجموع</span><span>{money(inv.subtotal, inv.currency)}</span></div>
            {inv.discount > 0 && <div className="flex justify-between"><span>الخصم</span><span>- {money(inv.discount, inv.currency)}</span></div>}
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>الإجمالي</span><span>{money(inv.total, inv.currency)}</span></div>
            <div className="flex justify-between text-emerald-700"><span>المدفوع</span><span>{money(inv.paid, inv.currency)}</span></div>
            <div className="flex justify-between font-bold text-red-700"><span>المتبقي</span><span>{money(inv.status === 'VOID' ? 0 : due, inv.currency)}</span></div>
          </div>
          {inv.notes && <div className="mt-4 text-sm text-slate-600">ملاحظات: {inv.notes}</div>}
          <div className="mt-8 text-center text-sm text-slate-500">{s.invoiceFooter}</div>
        </div>

        <div className="space-y-6 no-print">
          {inv.status !== 'VOID' && due > 0.001 && can(user, 'payments') && (
            <form action={recordPayment} className="card space-y-3">
              <h2>تسجيل دفعة</h2>
              <input type="hidden" name="invoiceId" value={inv.id} />
              <input name="amount" type="number" step="any" className="input" defaultValue={due} required />
              <select name="method" className="input"><Options map={PAY_METHODS} /></select>
              <input name="reference" className="input" placeholder="رقم الحوالة / الشيك (اختياري)" />
              <SubmitButton className="btn-success w-full">قبض</SubmitButton>
            </form>
          )}
          <div className="card">
            <h2 className="mb-3">الدفعات</h2>
            {inv.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm">
                <div>
                  <b>{money(p.amount, p.currency)}</b> — {PAY_METHODS[p.method]}
                  <div className="text-xs text-slate-500">{dateTime(p.createdAt)} {p.user ? `· ${p.user.name}` : ''} {p.reference ? `· ${p.reference}` : ''}</div>
                </div>
                {can(user, 'accounting') && (
                  <form action={removePayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className="text-xs text-red-600" confirm="حذف الدفعة؟">حذف</SubmitButton>
                  </form>
                )}
              </div>
            ))}
            {!inv.payments.length && <div className="text-sm text-slate-400">لا توجد دفعات</div>}
          </div>
        </div>
      </div>
    </>
  );
}
