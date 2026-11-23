import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Empty, SearchBar, LinkButton, Badge, Options } from '@/components/ui';
import { money, date } from '@/lib/format';
import { INVOICE_STATUS } from '@/lib/constants';

export default async function InvoicesPage({ searchParams }) {
  await requireAccess('invoices');
  const { q, status } = searchParams || {};
  const where = {};
  if (q) where.OR = [{ number: { contains: q } }, { client: { name: { contains: q } } }, { declaration: { refNo: { contains: q } } }];
  if (status === 'DUE') where.status = { in: ['UNPAID', 'PARTIAL'] };
  else if (status) where.status = status;

  const list = await db.invoice.findMany({ where, include: { client: true, declaration: true }, orderBy: { id: 'desc' }, take: 300 });

  return (
    <>
      <PageHeader title="الفواتير" subtitle={`${list.length} فاتورة`}>
        <LinkButton href="/invoices/new">+ فاتورة جديدة</LinkButton>
        <LinkButton kind="secondary" href="/pos">نقطة البيع</LinkButton>
      </PageHeader>
      <SearchBar q={q} placeholder="رقم فاتورة، عميل، معاملة...">
        <select name="status" className="input max-w-[11rem]" defaultValue={status || ''}>
          <option value="">كل الحالات</option>
          <option value="DUE">المستحقة</option>
          <Options map={INVOICE_STATUS} />
        </select>
      </SearchBar>
      <Table head={['الرقم', 'التاريخ', 'العميل', 'المعاملة', 'المصدر', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة']}>
        {list.map((i) => (
          <tr key={i.id}>
            <td><Link className="link" href={`/invoices/${i.id}`}>{i.number}</Link></td>
            <td>{date(i.createdAt)}</td>
            <td>{i.client.name}</td>
            <td>{i.declaration ? <Link className="link" href={`/declarations/${i.declaration.id}`}>{i.declaration.refNo}</Link> : '—'}</td>
            <td>{i.source === 'POS' ? 'نقطة بيع' : 'فاتورة'}</td>
            <td>{money(i.total, i.currency)}</td>
            <td>{money(i.paid, i.currency)}</td>
            <td className={i.total - i.paid > 0 && i.status !== 'VOID' ? 'font-bold text-red-700' : ''}>{money(i.status === 'VOID' ? 0 : i.total - i.paid, i.currency)}</td>
            <td><Badge map={INVOICE_STATUS} value={i.status} /></td>
          </tr>
        ))}
      </Table>
      {!list.length && <Empty />}
    </>
  );
}
