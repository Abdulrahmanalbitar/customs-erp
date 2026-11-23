'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { createInvoice, addPayment, deletePayment, voidInvoice } from '@/lib/billing';
import { num, str } from '@/lib/format';
import { logActivity } from '@/lib/activity';

export async function saveInvoice(formData) {
  const user = await requireAccess('invoices');
  const items = JSON.parse(formData.get('items') || '[]');
  const inv = await createInvoice({
    clientId: Number(formData.get('clientId')),
    declarationId: Number(formData.get('declarationId')) || null,
    currency: formData.get('currency') || 'USD',
    discount: num(formData.get('discount')),
    notes: str(formData.get('notes')),
    items,
    payment: { amount: num(formData.get('paidNow')), method: formData.get('method') || 'CASH' },
    userId: user.id,
  });
  await logActivity(user, 'أصدر فاتورة', 'invoice', inv.id, `${inv.number} · ${inv.total} ${inv.currency}`);
  revalidatePath('/invoices');
  redirect(`/invoices/${inv.id}`);
}

/** Used by POS (client component). Returns the new invoice id. */
export async function posCheckout(payload) {
  const user = await requireAccess('pos');
  try {
    const inv = await createInvoice({
      clientId: Number(payload.clientId),
      declarationId: Number(payload.declarationId) || null,
      currency: payload.currency,
      discount: Number(payload.discount) || 0,
      items: payload.items,
      payment: { amount: Number(payload.paid) || 0, method: payload.method, reference: payload.reference },
      userId: user.id,
      source: 'POS',
    });
    await logActivity(user, 'عملية بيع من نقطة البيع', 'invoice', inv.id, `${inv.number} · ${inv.total} ${inv.currency}`);
    revalidatePath('/invoices');
    return { ok: true, id: inv.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function recordPayment(formData) {
  const user = await requireAccess('payments');
  const invoiceId = Number(formData.get('invoiceId'));
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  const amount = Math.min(num(formData.get('amount')), inv.total - inv.paid);
  if (amount > 0) {
    await db.$transaction((tx) =>
      addPayment(tx, {
        invoiceId,
        clientId: inv.clientId,
        currency: inv.currency,
        amount,
        method: formData.get('method') || 'CASH',
        reference: str(formData.get('reference')),
        userId: user.id,
      })
    );
    await logActivity(user, 'قبض دفعة', 'invoice', invoiceId, `${inv.number} · ${amount} ${inv.currency}`);
  }
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function removePayment(formData) {
  await requireAccess('accounting');
  const p = await deletePayment(Number(formData.get('id')));
  revalidatePath('/payments');
  if (p.invoiceId) revalidatePath(`/invoices/${p.invoiceId}`);
}

export async function cancelInvoice(formData) {
  const user = await requireAccess('accounting');
  await logActivity(user, 'ألغى فاتورة', 'invoice', Number(formData.get('id')));
  const id = Number(formData.get('id'));
  try {
    await voidInvoice(id);
  } catch (e) {
    redirect(`/invoices/${id}?error=${encodeURIComponent(e.message)}`);
  }
  revalidatePath(`/invoices/${id}`);
}
