import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { PageHeader, Table, Badge, Empty, LinkButton, Stat } from '@/components/ui';
import { SubmitButton, PrintButton } from '@/components/buttons';
import { money, date } from '@/lib/format';
import { DECL_STATUS, DECL_TYPES, INVOICE_STATUS, PAY_METHODS } from '@/lib/constants';
import ClientForm from '../ClientForm';
import { deleteClient } from '../actions';

export default async function ClientPage({ params, searchParams }) {
  const user = await requireAccess('clients');
  const client = await db.client.findUnique({
    where: { id: Number(params.id) },
    include: {
      declarations: { orderBy: { id: 'desc' } },
      invoices: { orderBy: { id: 'desc' } },
      payments: { orderBy: { id: 'desc' }, include: { invoice: true } },
    },
  });
  if (!client) notFound();

  if (searchParams?.edit) {
    return (
      <>
        <PageHeader title={`تعديل: ${client.name}`} />
        <ClientForm client={client} />
      </>
    );
  }

  // statement per currency
  const statement = (cur) => {
    const rows = [
      ...client.invoices
        .filter((i) => i.currency === cur && i.status !== 'VOID')
        .map((i) => ({ d: i.createdAt, desc: `فاتورة ${i.number}`, debit: i.total, credit: 0 })),
      ...client.payments
        .filter((p) => p.currency === cur)
        .map((p) => ({ d: p.createdAt, desc: `دفعة ${PAY_METHODS[p.method]}${p.invoice ? ` – ${p.invoice.number}` : ''}`, debit: 0, credit: p.amount })),
    ].sort((a, b) => new Date(a.d) - new Date(b.d));
    let bal = 0;
    return rows.map((r) => ({ ...r, bal: (bal += r.debit - r.credit) }));
  };
  const usd = statement('USD');
  const syp = statement('SYP');
  const balUSD = usd.at(-1)?.bal || 0;
  const balSYP = syp.at(-1)?.bal || 0;

  return (
    <>
      <PageHeader title={client.name} subtitle={client.type === 'COMPANY' ? 'شركة' : 'فرد'}>
        {can(user, 'declarations') && <LinkButton href={`/declarations/new?client=${client.id}`}>+ معاملة جديدة</LinkButton>}
        {can(user, 'invoices') && <LinkButton kind="secondary" href={`/invoices/new?client=${client.id}`}>+ فاتورة</LinkButton>}
        <LinkButton kind="secondary" href={`/clients/${client.id}?edit=1`}>تعديل</LinkButton>
        <PrintButton>كشف حساب</PrintButton>
        <form action={deleteClient}>
          <input type="hidden" name="id" value={client.id} />
          <SubmitButton className="btn-danger" confirm="حذف العميل نهائياً؟">حذف</SubmitButton>
        </form>
      </PageHeader>
      {searchParams?.error === 'inuse' && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">لا يمكن حذف عميل لديه معاملات أو فواتير أو دفعات.</div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="الرصيد المستحق ($)" value={money(balUSD, 'USD')} tone={balUSD > 0 ? 'red' : 'green'} />
        <Stat label="الرصيد المستحق (ل.س)" value={money(balSYP, 'SYP')} tone={balSYP > 0 ? 'red' : 'green'} />
        <Stat label="عدد المعاملات" value={client.declarations.length} />
        <div className="card text-sm leading-7">
          <div>📞 <span dir="ltr">{client.phone || '—'}</span></div>
          <div>✉️ {client.email || '—'}</div>
          <div>رقم بطاقة المستورد: {client.taxNumber || '—'}</div>
          <div>السجل التجاري: {client.commercialReg || '—'}</div>
          <div>{client.address}</div>
        </div>
      </div>

      <div className="no-print">
        <h2 className="mb-3">المعاملات الجمركية</h2>
        <Table head={['المرجع', 'رقم البيان', 'النوع', 'البضاعة', 'الحالة', 'التاريخ']}>
          {client.declarations.map((d) => (
            <tr key={d.id}>
              <td><Link className="link" href={`/declarations/${d.id}`}>{d.refNo}</Link></td>
              <td>{d.declNo || '—'}</td>
              <td>{DECL_TYPES[d.type]}</td>
              <td>{d.goods || '—'}</td>
              <td><Badge map={DECL_STATUS} value={d.status} /></td>
              <td>{date(d.openedAt)}</td>
            </tr>
          ))}
        </Table>
        {!client.declarations.length && <Empty />}

        <h2 className="mb-3 mt-8">الفواتير</h2>
        <Table head={['الرقم', 'التاريخ', 'الإجمالي', 'المدفوع', 'الحالة']}>
          {client.invoices.map((i) => (
            <tr key={i.id}>
              <td><Link className="link" href={`/invoices/${i.id}`}>{i.number}</Link></td>
              <td>{date(i.createdAt)}</td>
              <td>{money(i.total, i.currency)}</td>
              <td>{money(i.paid, i.currency)}</td>
              <td><Badge map={INVOICE_STATUS} value={i.status} /></td>
            </tr>
          ))}
        </Table>
        {!client.invoices.length && <Empty />}
      </div>

      <h2 className="mb-3 mt-8">كشف الحساب</h2>
      {[['USD', usd], ['SYP', syp]].map(([cur, rows]) =>
        rows.length ? (
          <div key={cur} className="mb-6">
            <div className="mb-2 text-sm font-semibold text-slate-500">العملة: {cur === 'USD' ? 'دولار' : 'ليرة سورية'}</div>
            <Table head={['التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد']}>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{date(r.d)}</td>
                  <td>{r.desc}</td>
                  <td>{r.debit ? money(r.debit, cur) : ''}</td>
                  <td>{r.credit ? money(r.credit, cur) : ''}</td>
                  <td className="font-bold">{money(r.bal, cur)}</td>
                </tr>
              ))}
            </Table>
          </div>
        ) : null
      )}
      {!usd.length && !syp.length && <Empty>لا توجد حركات مالية</Empty>}
    </>
  );
}
