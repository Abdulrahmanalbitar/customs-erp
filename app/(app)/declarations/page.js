import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Empty, SearchBar, LinkButton, Badge, Options } from '@/components/ui';
import { date } from '@/lib/format';
import { DECL_STATUS, DECL_TYPES, OPEN_STATUSES } from '@/lib/constants';

export default async function DeclarationsPage({ searchParams }) {
  await requireAccess('declarations');
  const { q, status, type } = searchParams || {};
  const where = {};
  if (q) where.OR = [{ refNo: { contains: q } }, { declNo: { contains: q } }, { goods: { contains: q } }, { containerNo: { contains: q } }, { client: { name: { contains: q } } }];
  if (status === 'OPEN') where.status = { in: OPEN_STATUSES };
  else if (status) where.status = status;
  if (type) where.type = type;

  const list = await db.declaration.findMany({
    where,
    include: { client: true, employee: true, documents: { select: { received: true } } },
    orderBy: { id: 'desc' },
    take: 300,
  });

  return (
    <>
      <PageHeader title="المعاملات الجمركية" subtitle={`${list.length} معاملة`}>
        <LinkButton href="/declarations/new">+ معاملة جديدة</LinkButton>
      </PageHeader>
      <SearchBar q={q} placeholder="مرجع، رقم بيان، حاوية، عميل...">
        <select name="status" className="input max-w-[11rem]" defaultValue={status || ''}>
          <option value="">كل الحالات</option>
          <option value="OPEN">قيد التنفيذ</option>
          <Options map={DECL_STATUS} />
        </select>
        <select name="type" className="input max-w-[9rem]" defaultValue={type || ''}>
          <Options map={DECL_TYPES} all="كل الأنواع" />
        </select>
      </SearchBar>
      <Table head={['المرجع', 'العميل', 'النوع', 'رقم البيان', 'الأمانة', 'البضاعة', 'المستندات', 'المخلّص', 'الحالة', 'التاريخ']}>
        {list.map((d) => {
          const got = d.documents.filter((x) => x.received).length;
          return (
            <tr key={d.id}>
              <td><Link className="link" href={`/declarations/${d.id}`}>{d.refNo}</Link></td>
              <td>{d.client.name}</td>
              <td>{DECL_TYPES[d.type]}</td>
              <td>{d.declNo || '—'}</td>
              <td className="text-xs">{d.customsOffice || '—'}</td>
              <td>{d.goods || '—'}</td>
              <td className={got < d.documents.length ? 'text-amber-700' : 'text-emerald-700'}>{got}/{d.documents.length}</td>
              <td>{d.employee?.name || '—'}</td>
              <td><Badge map={DECL_STATUS} value={d.status} /></td>
              <td>{date(d.openedAt)}</td>
            </tr>
          );
        })}
      </Table>
      {!list.length && <Empty />}
    </>
  );
}
