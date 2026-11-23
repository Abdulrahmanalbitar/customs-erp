import { Ship } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import ShipmentForm from '../ShipmentForm';

export default async function NewShipment({ searchParams }) {
  await requireAccess('shipments');
  const [clients, declarations] = await Promise.all([
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.declaration.findMany({ where: { status: { not: 'CANCELLED' } }, include: { client: true }, orderBy: { id: 'desc' }, take: 200 }),
  ]);
  const defaults = {};
  if (searchParams?.declaration) {
    const d = declarations.find((x) => x.id === Number(searchParams.declaration));
    if (d) Object.assign(defaults, { clientId: d.clientId, declarationId: d.id, goods: d.goods, containerNo: d.containerNo });
  }
  return (
    <>
      <PageHeader title="شحنة جديدة" subtitle="يُولَّد رقم تتبع تلقائياً يمكن مشاركته مع العميل" icon={Ship} />
      <ShipmentForm clients={clients} declarations={declarations} defaults={defaults} />
    </>
  );
}
