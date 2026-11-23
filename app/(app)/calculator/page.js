import { Calculator } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { aiEnabled } from '@/lib/ai';
import { PageHeader } from '@/components/ui';
import DutyCalculator from './DutyCalculator';

export default async function CalculatorPage() {
  const user = await requireAccess('calculator');
  const [rates, clients, services, s] = await Promise.all([
    db.hsRate.findMany({ orderBy: { hsCode: 'asc' } }),
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.service.findMany({ where: { active: true } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="حاسبة الرسوم الجمركية" subtitle="احسب القيمة الجمركية (CIF) والرسوم والتكلفة الكاملة على العميل، وحوّلها لعرض سعر" icon={Calculator} />
      <DutyCalculator rates={rates} clients={clients} services={services} rate={s.rate} canQuote={can(user, 'quotes')} ai={aiEnabled() && can(user, 'ai')} />
    </>
  );
}
