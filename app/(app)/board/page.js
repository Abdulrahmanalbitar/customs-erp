import { KanbanSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { OPEN_STATUSES } from '@/lib/constants';
import Board from './Board';

export default async function BoardPage() {
  await requireAccess('board');
  const list = await db.declaration.findMany({
    where: { status: { in: [...OPEN_STATUSES, 'RELEASED'] } },
    include: { client: true, employee: true, documents: { select: { received: true } } },
    orderBy: { id: 'desc' },
  });
  const cards = list.map((d) => ({
    id: d.id, refNo: d.refNo, status: d.status, client: d.client.name, goods: d.goods, broker: d.employee?.name,
    priority: d.priority, docs: `${d.documents.filter((x) => x.received).length}/${d.documents.length}`,
    docsOk: d.documents.every((x) => x.received), days: Math.floor((Date.now() - d.openedAt.getTime()) / 864e5),
  }));
  return (
    <>
      <PageHeader title="لوحة سير العمل" subtitle="اسحب المعاملة بين المراحل لتحديث حالتها مباشرة" icon={KanbanSquare} />
      <Board initial={cards} />
    </>
  );
}
