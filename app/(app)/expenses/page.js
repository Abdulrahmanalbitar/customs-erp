import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { post, removeRef } from '@/lib/ledger';
import { PageHeader, Table, Empty, Options, Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { money, date, num, str } from '@/lib/format';
import { CURRENCIES, EXPENSE_CATEGORIES } from '@/lib/constants';

async function saveExpense(formData) {
  'use server';
  await requireAccess('expenses');
  const declarationId = Number(formData.get('declarationId')) || null;
  const onBehalf = formData.get('onBehalf') === 'on' && !!declarationId;
  const amount = num(formData.get('amount'));
  if (amount <= 0) return;
  const currency = formData.get('currency');
  const paidFrom = formData.get('paidFrom') === 'BANK' ? 'BANK' : 'CASH';
  await db.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: { category: formData.get('category'), description: str(formData.get('description')), amount, currency, onBehalf, declarationId },
    });
    await post(tx, {
      currency,
      description: `مصروف: ${e.category}${e.description ? ` – ${e.description}` : ''}`,
      refType: 'EXPENSE',
      refId: e.id,
      lines: [
        { account: onBehalf ? 'DISBURSEMENTS' : 'EXPENSE', debit: amount },
        { account: paidFrom, credit: amount },
      ],
    });
  });
  revalidatePath('/expenses');
  if (declarationId && formData.get('back')) redirect(`/declarations/${declarationId}`);
}

async function deleteExpense(formData) {
  'use server';
  await requireAccess('expenses');
  const id = Number(formData.get('id'));
  const e = await db.expense.findUnique({ where: { id } });
  if (e?.billed) return;
  await db.$transaction(async (tx) => {
    await removeRef(tx, 'EXPENSE', id);
    await tx.expense.delete({ where: { id } });
  });
  revalidatePath('/expenses');
}

export default async function ExpensesPage({ searchParams }) {
  await requireAccess('expenses');
  const preDecl = Number(searchParams?.declaration) || null;
  const [list, decls] = await Promise.all([
    db.expense.findMany({ include: { declaration: { include: { client: true } } }, orderBy: { id: 'desc' }, take: 300 }),
    db.declaration.findMany({ where: { status: { not: 'CANCELLED' } }, orderBy: { id: 'desc' }, include: { client: true }, take: 300 }),
  ]);

  return (
    <>
      <PageHeader title="المصاريف" subtitle="مصاريف المكتب، والمصاريف المدفوعة عن العملاء (تُضاف لفاتورة المعاملة)" />
      <form action={saveExpense} className="card mb-6 grid items-end gap-3 md:grid-cols-4">
        {preDecl && <input type="hidden" name="back" value="1" />}
        <Field label="البند">
          <select name="category" className="input">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="الوصف"><input name="description" className="input" /></Field>
        <Field label="المبلغ"><input name="amount" type="number" step="any" className="input" required /></Field>
        <Field label="العملة"><select name="currency" className="input"><Options map={CURRENCIES} /></select></Field>
        <Field label="المعاملة (اختياري)" className="md:col-span-2">
          <select name="declarationId" className="input" defaultValue={preDecl || ''}>
            <option value="">— مصروف عام للمكتب —</option>
            {decls.map((d) => <option key={d.id} value={d.id}>{d.refNo} – {d.client.name}</option>)}
          </select>
        </Field>
        <Field label="دُفع من">
          <select name="paidFrom" className="input"><option value="CASH">الصندوق</option><option value="BANK">البنك</option></select>
        </Field>
        <label className="flex items-center gap-2 pb-2 font-normal">
          <input type="checkbox" name="onBehalf" defaultChecked={!!preDecl} /> مدفوع عن العميل (يُسترد بالفاتورة)
        </label>
        <SubmitButton>حفظ المصروف</SubmitButton>
      </form>
      <Table head={['التاريخ', 'البند', 'الوصف', 'المعاملة', 'المبلغ', 'النوع', '']}>
        {list.map((e) => (
          <tr key={e.id}>
            <td>{date(e.createdAt)}</td>
            <td>{e.category}</td>
            <td>{e.description || '—'}</td>
            <td>{e.declaration ? <Link className="link" href={`/declarations/${e.declaration.id}`}>{e.declaration.refNo} – {e.declaration.client.name}</Link> : '—'}</td>
            <td className="font-bold">{money(e.amount, e.currency)}</td>
            <td>{e.onBehalf ? (e.billed ? 'عن العميل · مفوتر' : 'عن العميل · غير مفوتر') : 'مصروف مكتب'}</td>
            <td>
              {!e.billed && (
                <form action={deleteExpense}>
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="text-xs text-red-600" confirm="حذف المصروف؟">حذف</SubmitButton>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {!list.length && <Empty />}
    </>
  );
}
