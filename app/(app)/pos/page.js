import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import PosScreen from './PosScreen';

export default async function PosPage() {
  await requireAccess('pos');
  const [services, clients, declarations, s] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { id: 'asc' } }),
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true } }),
    db.declaration.findMany({
      where: { status: { notIn: ['CANCELLED', 'DELIVERED'] } },
      orderBy: { id: 'desc' },
      select: { id: true, refNo: true, goods: true, clientId: true },
    }),
    getSettings(),
  ]);
  return <PosScreen services={services} clients={clients} declarations={declarations} rate={s.rate} defaultCurrency={s.defaultCurrency} />;
}
