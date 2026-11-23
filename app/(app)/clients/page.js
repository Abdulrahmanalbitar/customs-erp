import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Empty, SearchBar, LinkButton } from '@/components/ui';
import { money } from '@/lib/format';
import { OPEN_STATUSES } from '@/lib/constants';

export default async function ClientsPage({ searchParams }) {
  await requireAccess('clients');
  const q = searchParams?.q?.trim();
  const clients = await db.client.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { taxNumber: { contains: q } }] } : {},
    include: {
      invoices: { where: { status: { not: 'VOID' } }, select: { total: true, paid: true, currency: true } },
      declarations: { where: { status: { in: OPEN_STATUSES } }, select: { id: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader title="العملاء" subtitle={`${clients.length} عميل`}>
        <LinkButton href="/clients/new">+ عميل جديد</LinkButton>
      </PageHeader>
      <SearchBar q={q} placeholder="اسم، هاتف، رقم مستورد..." />
      <Table head={['الاسم', 'النوع', 'الهاتف', 'معاملات مفتوحة', 'الرصيد المستحق $', 'الرصيد المستحق ل.س']}>
        {clients.map((c) => {
          const due = (cur) => c.invoices.filter((i) => i.currency === cur).reduce((s, i) => s + i.total - i.paid, 0);
          return (
            <tr key={c.id}>
              <td><Link className="link" href={`/clients/${c.id}`}>{c.name}</Link></td>
              <td>{c.type === 'COMPANY' ? 'شركة' : 'فرد'}</td>
              <td dir="ltr" className="text-right">{c.phone || '—'}</td>
              <td>{c.declarations.length}</td>
              <td className={due('USD') > 0 ? 'font-bold text-red-700' : ''}>{money(due('USD'), 'USD')}</td>
              <td className={due('SYP') > 0 ? 'font-bold text-red-700' : ''}>{money(due('SYP'), 'SYP')}</td>
            </tr>
          );
        })}
      </Table>
      {!clients.length && <Empty />}
    </>
  );
}
