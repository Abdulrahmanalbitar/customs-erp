import { FileSignature } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import QuoteForm from './QuoteForm';

export default async function NewQuote({ searchParams }) {
  await requireAccess('quotes');
  const [clients, services] = await Promise.all([
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.service.findMany({ where: { active: true } }),
  ]);
  return (
    <>
      <PageHeader title="عرض سعر جديد" icon={FileSignature} />
      <QuoteForm clients={clients} services={services} clientId={searchParams?.client || ''} />
    </>
  );
}
