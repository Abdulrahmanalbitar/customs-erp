import Link from 'next/link';
import { History } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Empty, SearchBar } from '@/components/ui';
import { dateTime } from '@/lib/format';

const LINK = { declaration: '/declarations/', shipment: '/shipments/', invoice: '/invoices/', quote: '/quotes/', client: '/clients/' };

export default async function ActivityPage({ searchParams }) {
  await requireAccess('activity');
  const q = searchParams?.q?.trim();
  const list = await db.activityLog.findMany({
    where: q ? { OR: [{ userName: { contains: q } }, { action: { contains: q } }, { details: { contains: q } }] } : {},
    orderBy: { id: 'desc' },
    take: 500,
  });
  return (
    <>
      <PageHeader title="سجل النشاط" subtitle="كل العمليات المهمة: من فعل ماذا ومتى" icon={History} />
      <SearchBar q={q} placeholder="مستخدم، عملية، رقم..." />
      <Table head={['الوقت', 'المستخدم', 'العملية', 'التفاصيل']}>
        {list.map((a) => (
          <tr key={a.id}>
            <td className="whitespace-nowrap text-xs text-slate-500">{dateTime(a.createdAt)}</td>
            <td className="font-semibold">{a.userName || 'النظام'}</td>
            <td>{a.action}</td>
            <td>{a.entityId && LINK[a.entity] ? <Link className="link" href={LINK[a.entity] + a.entityId}>{a.details || 'فتح'}</Link> : a.details || '—'}</td>
          </tr>
        ))}
      </Table>
      {!list.length && <Empty />}
    </>
  );
}
