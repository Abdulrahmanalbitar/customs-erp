import { requireAccess } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import ClientForm from '../ClientForm';

export default async function NewClient() {
  await requireAccess('clients');
  return (
    <>
      <PageHeader title="عميل جديد" />
      <ClientForm />
    </>
  );
}
