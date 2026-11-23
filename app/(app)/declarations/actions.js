'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { num, str, int } from '@/lib/format';
import { nextNumber } from '@/lib/ledger';
import { logActivity } from '@/lib/activity';
import { DECL_STATUS } from '@/lib/constants';
import { saveUpload } from '@/lib/storage';

function data(f) {
  return {
    declNo: str(f.get('declNo')),
    type: f.get('type') || 'IMPORT',
    customsOffice: str(f.get('customsOffice')),
    clientId: Number(f.get('clientId')),
    employeeId: int(f.get('employeeId')),
    goods: str(f.get('goods')),
    hsCode: str(f.get('hsCode')),
    origin: str(f.get('origin')),
    transport: str(f.get('transport')),
    containerNo: str(f.get('containerNo')),
    billOfLading: str(f.get('billOfLading')),
    weight: f.get('weight') ? num(f.get('weight')) : null,
    packages: int(f.get('packages')),
    goodsValue: num(f.get('goodsValue')),
    currency: f.get('currency') || 'USD',
    dutyAmount: num(f.get('dutyAmount')),
    notes: str(f.get('notes')),
    priority: f.get('priority') || 'NORMAL',
    dueDate: f.get('dueDate') ? new Date(f.get('dueDate')) : null,
  };
}

export async function saveDeclaration(formData) {
  const user = await requireAccess('declarations');
  const id = Number(formData.get('id') || 0);
  let decl;
  if (id) {
    decl = await db.declaration.update({ where: { id }, data: data(formData) });
    await logActivity(user, 'عدّل المعاملة', 'declaration', decl.id, decl.refNo);
  } else {
    const refNo = await nextNumber(null, 'CL', 'declaration', 'refNo');
    const docs = formData.getAll('docs');
    decl = await db.declaration.create({
      data: {
        ...data(formData),
        refNo,
        events: { create: { status: 'RECEIVED', note: 'فتح المعاملة', by: user.name } },
        documents: { create: docs.map((kind) => ({ kind })) },
      },
    });
    await logActivity(user, 'فتح معاملة جديدة', 'declaration', decl.id, `${refNo}${decl.goods ? ' · ' + decl.goods : ''}`);
  }
  revalidatePath('/declarations');
  redirect(`/declarations/${decl.id}`);
}

export async function changeStatus(formData) {
  const user = await requireAccess('declarations');
  const id = Number(formData.get('id'));
  const status = formData.get('status');
  await db.declaration.update({
    where: { id },
    data: {
      status,
      ...(status === 'RELEASED' ? { releasedAt: new Date() } : {}),
      events: { create: { status, note: str(formData.get('note')), by: user.name } },
    },
  });
  await logActivity(user, `نقل المعاملة إلى «${DECL_STATUS[status]?.label}»`, 'declaration', id);
  revalidatePath(`/declarations/${id}`);
}

/** used by the drag & drop board */
export async function moveDeclaration(id, status) {
  const user = await requireAccess('declarations');
  if (!DECL_STATUS[status]) return;
  const d = await db.declaration.update({
    where: { id: Number(id) },
    data: {
      status,
      ...(status === 'RELEASED' ? { releasedAt: new Date() } : {}),
      events: { create: { status, note: 'من لوحة سير العمل', by: user.name } },
    },
  });
  await logActivity(user, `نقل المعاملة إلى «${DECL_STATUS[status]?.label}»`, 'declaration', d.id, d.refNo);
  revalidatePath('/board');
}

export async function addDocument(formData) {
  await requireAccess('declarations');
  const id = Number(formData.get('declarationId'));
  const file = formData.get('file');
  const up = file && typeof file !== 'string' && file.size > 0 ? await saveUpload(file) : null;
  await db.document.create({
    data: {
      declarationId: id,
      kind: str(formData.get('kind')) || 'مستند',
      number: str(formData.get('number')),
      received: formData.get('received') === 'on' || !!up,
      ...(up || {}),
    },
  });
  revalidatePath(`/declarations/${id}`);
}

export async function attachFile(formData) {
  await requireAccess('declarations');
  const doc = await db.document.findUnique({ where: { id: Number(formData.get('id')) } });
  const file = formData.get('file');
  if (doc && file && typeof file !== 'string' && file.size > 0) {
    const { blob, ...meta } = await saveUpload(file);
    await db.document.update({ where: { id: doc.id }, data: { ...meta, received: true, blob: { upsert: { create: blob.create, update: blob.create } } } });
  }
  revalidatePath(`/declarations/${doc.declarationId}`);
}

export async function toggleDocument(formData) {
  await requireAccess('declarations');
  const doc = await db.document.findUnique({ where: { id: Number(formData.get('id')) } });
  await db.document.update({ where: { id: doc.id }, data: { received: !doc.received } });
  revalidatePath(`/declarations/${doc.declarationId}`);
}

export async function deleteDocument(formData) {
  await requireAccess('declarations');
  const doc = await db.document.delete({ where: { id: Number(formData.get('id')) } });
  revalidatePath(`/declarations/${doc.declarationId}`);
}
