import Link from 'next/link';
import { FileSignature, Plus, Calculator } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Badge, Empty } from '@/components/ui';
import { money, date } from '@/lib/format';
import { QUOTE_STATUS } from '@/lib/constants';

export default async function QuotesPage() {
  await requireAccess('quotes');
  const list = await db.quote.findMany({ include: { client: true }, orderBy: { id: 'desc' }, take: 300 });
  return (
    <>
      <PageHeader title="عروض الأسعار" subtitle="أرسل عرضاً للعميل ثم حوّله لفاتورة بنقرة" icon={FileSignature}>
        <Link href="/quotes/new" className="btn-primary"><Plus className="h-4 w-4" /> عرض جديد</Link>
        <Link href="/calculator" className="btn-secondary"><Calculator className="h-4 w-4" /> من حاسبة الرسوم</Link>
      </PageHeader>
      <Table head={['الرقم', 'العميل', 'التاريخ', 'صالح حتى', 'الإجمالي', 'الحالة']}>
        {list.map((q) => (
          <tr key={q.id}>
            <td><Link href={`/quotes/${q.id}`} className="link font-mono text-xs">{q.number}</Link></td>
            <td>{q.client.name}</td>
            <td>{date(q.createdAt)}</td>
            <td className={q.validUntil < new Date() && ['DRAFT', 'SENT'].includes(q.status) ? 'text-red-500' : ''}>{date(q.validUntil)}</td>
            <td className="font-semibold">{money(q.total, q.currency)}</td>
            <td><Badge map={QUOTE_STATUS} value={q.status} /></td>
          </tr>
        ))}
      </Table>
      {!list.length && <Empty />}
    </>
  );
}
