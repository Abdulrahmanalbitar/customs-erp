import { db } from './db';
import { post, nextNumber, refreshInvoice, cashAccount, removeRef } from './ledger';

/**
 * items: [{ description, kind: 'SERVICE'|'DISBURSEMENT', qty, price, expenseId? }]
 * payment: { amount, method, reference } | null
 */
export async function createInvoice({ clientId, declarationId, currency, items, discount = 0, notes, payment, userId, source = 'INVOICE' }) {
  const clean = items
    .map((i) => ({ ...i, qty: Number(i.qty) || 1, price: Number(i.price) || 0 }))
    .filter((i) => i.description && i.price > 0);
  if (!clean.length) throw new Error('الفاتورة فارغة');
  const subtotal = clean.reduce((s, i) => s + i.qty * i.price, 0);
  discount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - discount;

  return db.$transaction(async (tx) => {
    const number = await nextNumber(tx, source === 'POS' ? 'POS' : 'INV', 'invoice', 'number');
    const inv = await tx.invoice.create({
      data: {
        number,
        clientId,
        declarationId: declarationId || null,
        currency,
        subtotal,
        discount,
        total,
        notes: notes || null,
        source,
        items: {
          create: clean.map((i) => ({ description: i.description, kind: i.kind || 'SERVICE', qty: i.qty, price: i.price, total: i.qty * i.price, expenseId: i.expenseId ? Number(i.expenseId) : null })),
        },
      },
    });

    const expenseIds = clean.filter((i) => i.expenseId).map((i) => Number(i.expenseId));
    if (expenseIds.length) await tx.expense.updateMany({ where: { id: { in: expenseIds } }, data: { billed: true } });

    const disb = clean.filter((i) => i.kind === 'DISBURSEMENT').reduce((s, i) => s + i.qty * i.price, 0);
    const revenue = total - disb;
    await post(tx, {
      currency,
      description: `فاتورة ${number}`,
      refType: 'INVOICE',
      refId: inv.id,
      lines: [
        { account: 'RECEIVABLE', debit: total },
        { account: 'REVENUE', credit: Math.max(revenue, 0) },
        { account: 'DISBURSEMENTS', credit: Math.min(disb, total) },
      ],
    });

    if (payment && Number(payment.amount) > 0) {
      await addPayment(tx, { invoiceId: inv.id, clientId, currency, amount: Math.min(Number(payment.amount), total), method: payment.method, reference: payment.reference, userId });
    }
    return inv;
  });
}

export async function addPayment(tx, { invoiceId, clientId, currency, amount, method = 'CASH', reference, userId }) {
  const p = await tx.payment.create({
    data: { invoiceId: invoiceId || null, clientId, currency, amount, method, reference: reference || null, userId: userId || null },
  });
  await post(tx, {
    currency,
    description: `قبض دفعة #${p.id}`,
    refType: 'PAYMENT',
    refId: p.id,
    lines: [
      { account: cashAccount(method), debit: amount },
      { account: 'RECEIVABLE', credit: amount },
    ],
  });
  if (invoiceId) await refreshInvoice(tx, invoiceId);
  return p;
}

export async function deletePayment(id) {
  return db.$transaction(async (tx) => {
    const p = await tx.payment.delete({ where: { id } });
    await removeRef(tx, 'PAYMENT', id);
    if (p.invoiceId) await refreshInvoice(tx, p.invoiceId);
    return p;
  });
}

export async function voidInvoice(id) {
  return db.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id }, include: { payments: true, items: true } });
    if (inv.payments.length) throw new Error('لا يمكن إلغاء فاتورة عليها دفعات. احذف الدفعات أولاً.');
    await removeRef(tx, 'INVOICE', id);
    await tx.invoice.update({ where: { id }, data: { status: 'VOID' } });
    const ids = inv.items.map((i) => i.expenseId).filter(Boolean);
    if (ids.length) await tx.expense.updateMany({ where: { id: { in: ids } }, data: { billed: false } });
  });
}
