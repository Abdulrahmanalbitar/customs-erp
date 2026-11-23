import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { addPayment } from '@/lib/billing';
import { PageHeader, Table, Empty, Options, Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { money, dateTime, num, str } from '@/lib/format';
import { PAY_METHODS, CURRENCIES } from '@/lib/constants';
import { removePayment } from '../invoices/actions';

async function onAccount(formData) {
  'use server';
  const user = await requireAccess('payments');
  const amount = num(formData.get('amount'));
  if (amount <= 0) return;
  await db.$transaction((tx) =>
    addPayment(tx, {
      clientId: Number(formData.get('clientId')),
      currency: formData.get('currency'),
      amount,
      method: formData.get('method'),
      reference: str(formData.get('reference')),
      userId: user.id,
    })
  );
  revalidatePath('/payments');
}

export default async function PaymentsPage({ searchParams }) {
  const user = await requireAccess('payments');
  const from = searchParams?.from ? new Date(searchParams.from) : new Date(Date.now() - 30 * 864e5);
  const [list, clients] = await Promise.all([
    db.payment.findMany({ where: { createdAt: { gte: from } }, include: { client: true, invoice: true, user: true }, orderBy: { id: 'desc' } }),
    db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  const sum = (cur) => list.filter((p) => p.currency === cur).reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader title="المقبوضات" subtitle={`منذ ${from.toLocaleDateString('en-GB')} — ${money(sum('USD'), 'USD')} · ${money(sum('SYP'), 'SYP')}`} />
      <form action={onAccount} className="card mb-6 grid items-end gap-3 md:grid-cols-6">
        <h2 className="md:col-span-6">دفعة على الحساب (غير مرتبطة بفاتورة)</h2>
        <Field label="العميل" className="md:col-span-2">
          <select name="clientId" className="input" required>
            <option value="">— اختر —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="المبلغ"><input name="amount" type="number" step="any" className="input" required /></Field>
        <Field label="العملة"><select name="currency" className="input"><Options map={CURRENCIES} /></select></Field>
        <Field label="الطريقة"><select name="method" className="input"><Options map={PAY_METHODS} /></select></Field>
        <SubmitButton className="btn-success">قبض</SubmitButton>
        <input name="reference" className="input md:col-span-6" placeholder="مرجع / ملاحظة" />
      </form>
      <form className="mb-3 flex items-center gap-2 no-print">
        <label className="mb-0">من تاريخ</label>
        <input type="date" name="from" className="input max-w-[12rem]" defaultValue={from.toISOString().slice(0, 10)} />
        <button className="btn-secondary">عرض</button>
      </form>
      <Table head={['#', 'التاريخ', 'العميل', 'الفاتورة', 'المبلغ', 'الطريقة', 'المرجع', 'بواسطة', '']}>
        {list.map((p) => (
          <tr key={p.id}>
            <td>{p.id}</td>
            <td>{dateTime(p.createdAt)}</td>
            <td><Link className="link" href={`/clients/${p.clientId}`}>{p.client.name}</Link></td>
            <td>{p.invoice ? <Link className="link" href={`/invoices/${p.invoice.id}`}>{p.invoice.number}</Link> : 'على الحساب'}</td>
            <td className="font-bold">{money(p.amount, p.currency)}</td>
            <td>{PAY_METHODS[p.method]}</td>
            <td>{p.reference || '—'}</td>
            <td>{p.user?.name || '—'}</td>
            <td>
              {can(user, 'accounting') && (
                <form action={removePayment}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="text-xs text-red-600" confirm="حذف الدفعة وعكس قيدها؟">حذف</SubmitButton>
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
