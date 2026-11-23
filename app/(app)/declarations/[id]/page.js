import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { aiEnabled } from '@/lib/ai';
import { PageHeader, Table, Badge, Empty, LinkButton, Options, Field } from '@/components/ui';
import { SubmitButton, PrintButton } from '@/components/buttons';
import { money, date, dateTime } from '@/lib/format';
import { DECL_STATUS, DECL_TYPES, TRANSPORT, INVOICE_STATUS, DOC_KINDS } from '@/lib/constants';
import DeclarationForm from '../DeclarationForm';
import { changeStatus, addDocument, toggleDocument, deleteDocument, attachFile } from '../actions';
import { Paperclip, Ship, Plus } from 'lucide-react';
import { SHIP_STATUS, PRIORITY } from '@/lib/constants';

export default async function DeclarationPage({ params, searchParams }) {
  const user = await requireAccess('declarations');
  const d = await db.declaration.findUnique({
    where: { id: Number(params.id) },
    include: {
      client: true,
      employee: true,
      documents: { orderBy: { id: 'asc' } },
      events: { orderBy: { id: 'desc' } },
      invoices: { orderBy: { id: 'desc' } },
      expenses: { orderBy: { id: 'desc' } },
      shipments: { orderBy: { id: 'desc' } },
    },
  });
  if (!d) notFound();

  if (searchParams?.edit) {
    const [clients, employees, s] = await Promise.all([
      db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      db.employee.findMany({ where: { active: true } }),
      getSettings(),
    ]);
    return (
      <>
        <PageHeader title={`تعديل المعاملة ${d.refNo}`} />
        <DeclarationForm decl={d} clients={clients} employees={employees} offices={s.customsOfficeList} ai={aiEnabled()} />
      </>
    );
  }

  const info = [
    ['العميل', <Link key="c" className="link" href={`/clients/${d.client.id}`}>{d.client.name}</Link>],
    ['النوع', DECL_TYPES[d.type]],
    ['رقم البيان', d.declNo || '—'],
    ['الأمانة الجمركية', d.customsOffice || '—'],
    ['المخلّص', d.employee?.name || '—'],
    ['وسيلة الشحن', TRANSPORT[d.transport] || '—'],
    ['البضاعة', d.goods || '—'],
    ['البند الجمركي', d.hsCode || '—'],
    ['المنشأ', d.origin || '—'],
    ['رقم الحاوية', d.containerNo || '—'],
    ['البوليصة', d.billOfLading || '—'],
    ['الوزن / الطرود', `${d.weight ?? '—'} كغ / ${d.packages ?? '—'}`],
    ['قيمة البضاعة', money(d.goodsValue, d.currency)],
    ['الرسوم المقدّرة', money(d.dutyAmount, d.currency)],
    ['تاريخ الفتح', date(d.openedAt)],
    ['تاريخ الإفراج', date(d.releasedAt)],
  ];
  const unbilled = d.expenses.filter((e) => e.onBehalf && !e.billed);

  return (
    <>
      <PageHeader title={`معاملة ${d.refNo}`} subtitle={<span className="flex gap-2"><Badge map={DECL_STATUS} value={d.status} /><Badge map={PRIORITY} value={d.priority} />{d.dueDate && <span className="badge bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">الموعد: {date(d.dueDate)}</span>}</span>}>
        <LinkButton kind="secondary" href={`/shipments/new?declaration=${d.id}`}>+ شحنة</LinkButton>
        {can(user, 'invoices') && <LinkButton href={`/invoices/new?declaration=${d.id}`}>+ فاتورة لهذه المعاملة</LinkButton>}
        {can(user, 'expenses') && <LinkButton kind="secondary" href={`/expenses?declaration=${d.id}`}>+ مصروف</LinkButton>}
        <LinkButton kind="secondary" href={`/declarations/${d.id}?edit=1`}>تعديل</LinkButton>
        <PrintButton />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                <span className="text-slate-500">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
            {d.notes && <div className="sm:col-span-2 text-slate-600">📝 {d.notes}</div>}
          </div>

          <div className="card">
            <h2 className="mb-3">المستندات</h2>
            <div className="divide-y">
              {d.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <form action={toggleDocument}>
                      <input type="hidden" name="id" value={doc.id} />
                      <button className={`badge ${doc.received ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {doc.received ? '✓ مستلم' : '✗ ناقص'}
                      </button>
                    </form>
                    <span className="font-semibold">{doc.kind}</span>
                    {doc.number && <span className="text-slate-500">#{doc.number}</span>}
                    {doc.filePath && <a href={`/api/files/${doc.id}`} target="_blank" className="link flex items-center gap-1 text-xs"><Paperclip className="h-3.5 w-3.5" />{doc.fileName}</a>}
                  </div>
                  <div className="no-print flex items-center gap-3">
                  {!doc.filePath && (
                    <form action={attachFile} className="flex items-center">
                      <input type="hidden" name="id" value={doc.id} />
                      <label className="mb-0 flex cursor-pointer items-center gap-1 text-xs text-brand-600 hover:underline"><Paperclip className="h-3.5 w-3.5" />إرفاق<input type="file" name="file" className="hidden" /></label>
                      <button className="mr-1 text-xs link">رفع</button>
                    </form>
                  )}
                  <form action={deleteDocument}>
                    <input type="hidden" name="id" value={doc.id} />
                    <button className="text-xs text-red-600 hover:underline">حذف</button>
                  </form>
                  </div>
                </div>
              ))}
            </div>
            {!d.documents.length && <Empty />}
            <form action={addDocument} className="no-print mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
              <input type="hidden" name="declarationId" value={d.id} />
              <Field label="نوع المستند">
                <input name="kind" list="dockinds" className="input" required />
                <datalist id="dockinds">{DOC_KINDS.map((k) => <option key={k} value={k} />)}</datalist>
              </Field>
              <Field label="الرقم"><input name="number" className="input w-32" /></Field>
              <Field label="ملف (اختياري)"><input type="file" name="file" className="input py-1.5 text-xs" /></Field>
              <label className="flex items-center gap-2 pb-2 font-normal"><input type="checkbox" name="received" /> مستلم</label>
              <SubmitButton className="btn-secondary">إضافة</SubmitButton>
            </form>
          </div>

          {d.shipments.length > 0 && (
            <div className="card">
              <h2 className="mb-3 flex items-center gap-2"><Ship className="h-4 w-4" /> الشحنات المرتبطة</h2>
              {d.shipments.map((s) => (
                <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5">
                  <span className="font-mono">{s.trackingNo}</span><span>{s.originPort} ← {s.destPort}</span><Badge map={SHIP_STATUS} value={s.status} /><span className="text-xs text-slate-500">ETA {date(s.eta)}</span>
                </Link>
              ))}
            </div>
          )}

          <div>
            <h2 className="mb-3">الفواتير</h2>
            <Table head={['الرقم', 'التاريخ', 'الإجمالي', 'المدفوع', 'الحالة']}>
              {d.invoices.map((i) => (
                <tr key={i.id}>
                  <td><Link className="link" href={`/invoices/${i.id}`}>{i.number}</Link></td>
                  <td>{date(i.createdAt)}</td>
                  <td>{money(i.total, i.currency)}</td>
                  <td>{money(i.paid, i.currency)}</td>
                  <td><Badge map={INVOICE_STATUS} value={i.status} /></td>
                </tr>
              ))}
            </Table>
            {!d.invoices.length && <Empty />}
          </div>

          <div>
            <h2 className="mb-3">المصاريف على المعاملة</h2>
            {unbilled.length > 0 && (
              <div className="mb-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                يوجد {unbilled.length} مصروف مدفوع عن العميل لم يُفوتر بعد — سيُضاف تلقائياً عند إنشاء فاتورة لهذه المعاملة.
              </div>
            )}
            <Table head={['التاريخ', 'البند', 'الوصف', 'المبلغ', 'عن العميل', 'مفوتر']}>
              {d.expenses.map((e) => (
                <tr key={e.id}>
                  <td>{date(e.createdAt)}</td>
                  <td>{e.category}</td>
                  <td>{e.description || '—'}</td>
                  <td>{money(e.amount, e.currency)}</td>
                  <td>{e.onBehalf ? 'نعم' : 'لا'}</td>
                  <td>{e.onBehalf ? (e.billed ? '✓' : '✗') : '—'}</td>
                </tr>
              ))}
            </Table>
            {!d.expenses.length && <Empty />}
          </div>
        </div>

        <div className="space-y-6">
          <form action={changeStatus} className="card no-print space-y-3">
            <h2>تحديث حالة المعاملة</h2>
            <input type="hidden" name="id" value={d.id} />
            <select name="status" className="input" defaultValue={d.status}><Options map={DECL_STATUS} /></select>
            <input name="note" className="input" placeholder="ملاحظة (اختياري)" />
            <SubmitButton className="btn-primary w-full">تحديث</SubmitButton>
          </form>
          <div className="card">
            <h2 className="mb-4">سجل المراحل</h2>
            <ol className="relative border-r-2 border-slate-200 pr-4">
              {d.events.map((e) => (
                <li key={e.id} className="mb-5">
                  <span className="absolute -right-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand-500" />
                  <Badge map={DECL_STATUS} value={e.status} />
                  <div className="mt-1 text-xs text-slate-500">{dateTime(e.createdAt)} — {e.by}</div>
                  {e.note && <div className="mt-1 text-sm">{e.note}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
