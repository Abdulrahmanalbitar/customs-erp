import { db } from './db';

/**
 * Double-entry helper. lines: [{ account, debit, credit }]
 * All lines share currency/description/ref.
 */
export async function post(tx, { lines, currency, description, refType, refId, date }) {
  const client = tx || db;
  const d = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const c = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(d - c) > 0.001) throw new Error('قيد غير متوازن');
  for (const l of lines) {
    if (!l.debit && !l.credit) continue;
    await client.journalEntry.create({
      data: {
        account: l.account,
        debit: l.debit || 0,
        credit: l.credit || 0,
        currency,
        description,
        refType,
        refId,
        ...(date ? { date } : {}),
      },
    });
  }
}

export async function removeRef(tx, refType, refId) {
  await (tx || db).journalEntry.deleteMany({ where: { refType, refId } });
}

export function cashAccount(method) {
  return method === 'CASH' ? 'CASH' : 'BANK';
}

export async function nextNumber(tx, prefix, model, field) {
  const client = tx || db;
  const year = new Date().getFullYear();
  const start = `${prefix}-${year}-`;
  const last = await client[model].findFirst({
    where: { [field]: { startsWith: start } },
    orderBy: { id: 'desc' },
    select: { [field]: true },
  });
  const n = last ? parseInt(last[field].slice(start.length), 10) + 1 : 1;
  return `${start}${String(n).padStart(5, '0')}`;
}

/** recompute paid/status of an invoice from its payments */
export async function refreshInvoice(tx, invoiceId) {
  const client = tx || db;
  const inv = await client.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!inv) return;
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  let status = inv.status === 'VOID' ? 'VOID' : paid <= 0.001 ? 'UNPAID' : paid + 0.001 >= inv.total ? 'PAID' : 'PARTIAL';
  await client.invoice.update({ where: { id: invoiceId }, data: { paid, status } });
}
