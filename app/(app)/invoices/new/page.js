import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import InvoiceForm from '../InvoiceForm';

export default async function NewInvoice({ searchParams }) {
  await requireAccess('invoices');
  const [clients, services, declarations] = await Promise.all([
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.declaration.findMany({ where: { status: { not: 'CANCELLED' } }, orderBy: { id: 'desc' }, select: { id: true, refNo: true, goods: true, clientId: true } }),
  ]);

  const initial = { clientId: searchParams?.client || '' };
  if (searchParams?.declaration) {
    const d = await db.declaration.findUnique({
      where: { id: Number(searchParams.declaration) },
      include: { expenses: { where: { onBehalf: true, billed: false } } },
    });
    if (d) {
      initial.clientId = d.clientId;
      initial.declarationId = d.id;
      initial.currency = d.expenses[0]?.currency || 'USD';
      initial.items = [
        { description: `أتعاب تخليص جمركي – معاملة ${d.refNo}`, kind: 'SERVICE', qty: 1, price: services.find((s) => s.name.includes('تخليص'))?.price || 0 },
        ...d.expenses.map((e) => ({ description: `${e.category}${e.description ? ` – ${e.description}` : ''}`, kind: 'DISBURSEMENT', qty: 1, price: e.amount, expenseId: e.id })),
      ];
    }
  }

  return (
    <>
      <PageHeader title="فاتورة جديدة" subtitle="البنود من نوع «مصروف مسترد» تُسجَّل محاسبياً كاسترداد وليس كإيراد" />
      <InvoiceForm clients={clients} services={services} declarations={declarations} initial={initial} />
    </>
  );
}
