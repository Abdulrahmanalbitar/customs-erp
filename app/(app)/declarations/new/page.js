import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { aiEnabled } from '@/lib/ai';
import { PageHeader } from '@/components/ui';
import DeclarationForm from '../DeclarationForm';

export default async function NewDeclaration({ searchParams }) {
  await requireAccess('declarations');
  const [clients, employees, s] = await Promise.all([
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="معاملة جمركية جديدة" />
      <DeclarationForm clients={clients} employees={employees} offices={s.customsOfficeList} ai={aiEnabled()} defaultClient={searchParams?.client} />
    </>
  );
}
