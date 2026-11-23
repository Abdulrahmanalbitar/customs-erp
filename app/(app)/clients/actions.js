'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { str } from '@/lib/format';
import { logActivity } from '@/lib/activity';

function data(f) {
  return {
    name: str(f.get('name')) || 'بدون اسم',
    type: f.get('type') || 'COMPANY',
    phone: str(f.get('phone')),
    email: str(f.get('email')),
    taxNumber: str(f.get('taxNumber')),
    commercialReg: str(f.get('commercialReg')),
    address: str(f.get('address')),
    notes: str(f.get('notes')),
  };
}

export async function saveClient(formData) {
  const user = await requireAccess('clients');
  const id = Number(formData.get('id') || 0);
  const c = id
    ? await db.client.update({ where: { id }, data: data(formData) })
    : await db.client.create({ data: data(formData) });
  await logActivity(user, id ? 'عدّل بيانات عميل' : 'أضاف عميلاً جديداً', 'client', c.id, c.name);
  revalidatePath('/clients');
  redirect(`/clients/${c.id}`);
}

export async function deleteClient(formData) {
  await requireAccess('clients');
  const id = Number(formData.get('id'));
  const used = await db.client.findUnique({
    where: { id },
    include: { _count: { select: { declarations: true, invoices: true, payments: true } } },
  });
  if (used && (used._count.declarations || used._count.invoices || used._count.payments)) {
    redirect(`/clients/${id}?error=inuse`);
  }
  await db.client.delete({ where: { id } });
  redirect('/clients');
}
