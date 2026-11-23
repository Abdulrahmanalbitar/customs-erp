'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { nextNumber } from '@/lib/ledger';
import { createInvoice } from '@/lib/billing';
import { str } from '@/lib/format';

async function create({ clientId, currency = 'USD', items, notes, validDays = 15 }, user) {
  const clean = items.map((i) => ({ description: String(i.description || ''), qty: Number(i.qty) || 1, price: Number(i.price) || 0 })).filter((i) => i.description && i.price > 0);
  if (!clean.length) throw new Error('عرض فارغ');
  const number = await nextNumber(null, 'QT', 'quote', 'number');
  const q = await db.quote.create({
    data: {
      number, clientId: Number(clientId), currency, notes: notes || null,
      total: clean.reduce((s, i) => s + i.qty * i.price, 0),
      validUntil: new Date(Date.now() + validDays * 864e5),
      items: { create: clean },
    },
  });
  await logActivity(user, 'أنشأ عرض سعر', 'quote', q.id, number);
  return q;
}

export async function createQuoteFromCalc(payload) {
  const user = await requireAccess('quotes');
  const q = await create(payload, user);
  revalidatePath('/quotes');
  return { id: q.id };
}

export async function saveQuote(formData) {
  const user = await requireAccess('quotes');
  const q = await create({
    clientId: formData.get('clientId'),
    currency: formData.get('currency'),
    items: JSON.parse(formData.get('items') || '[]'),
    notes: str(formData.get('notes')),
    validDays: Number(formData.get('validDays')) || 15,
  }, user);
  redirect(`/quotes/${q.id}`);
}

export async function setQuoteStatus(formData) {
  const user = await requireAccess('quotes');
  const id = Number(formData.get('id'));
  const status = formData.get('status');
  const q = await db.quote.update({ where: { id }, data: { status } });
  await logActivity(user, `غيّر حالة عرض السعر إلى ${status}`, 'quote', id, q.number);
  revalidatePath(`/quotes/${id}`);
}

export async function convertQuote(formData) {
  const user = await requireAccess('invoices');
  const id = Number(formData.get('id'));
  const q = await db.quote.findUnique({ where: { id }, include: { items: true } });
  if (q.invoiceId) redirect(`/invoices/${q.invoiceId}`);
  const inv = await createInvoice({
    clientId: q.clientId,
    currency: q.currency,
    notes: `من عرض السعر ${q.number}`,
    items: q.items.map((i) => ({ description: i.description, qty: i.qty, price: i.price, kind: /رسوم|مرفأ|نقل/.test(i.description) ? 'DISBURSEMENT' : 'SERVICE' })),
    userId: user.id,
  });
  await db.quote.update({ where: { id }, data: { status: 'INVOICED', invoiceId: inv.id } });
  await logActivity(user, 'حوّل عرض سعر إلى فاتورة', 'invoice', inv.id, `${q.number} ← ${inv.number}`);
  redirect(`/invoices/${inv.id}`);
}
