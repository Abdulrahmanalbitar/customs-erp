'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { nextTracking } from '@/lib/shipping';
import { SHIP_STATUS } from '@/lib/constants';
import { num, str, int } from '@/lib/format';

const d = (v) => (v ? new Date(v) : null);

function data(f) {
  return {
    clientId: Number(f.get('clientId')),
    declarationId: int(f.get('declarationId')),
    mode: f.get('mode') || 'SEA',
    carrier: str(f.get('carrier')),
    vessel: str(f.get('vessel')),
    voyage: str(f.get('voyage')),
    containerNo: str(f.get('containerNo')),
    containerType: str(f.get('containerType')),
    blNo: str(f.get('blNo')),
    originPort: str(f.get('originPort')) || '—',
    destPort: str(f.get('destPort')) || '—',
    etd: d(f.get('etd')),
    eta: d(f.get('eta')),
    goods: str(f.get('goods')),
    weight: f.get('weight') ? num(f.get('weight')) : null,
    notes: str(f.get('notes')),
  };
}

export async function saveShipment(formData) {
  const user = await requireAccess('shipments');
  const id = Number(formData.get('id') || 0);
  let s;
  if (id) {
    s = await db.shipment.update({ where: { id }, data: data(formData) });
    await logActivity(user, 'عدّل الشحنة', 'shipment', s.id, s.trackingNo);
  } else {
    const trackingNo = await nextTracking(db);
    const x = data(formData);
    s = await db.shipment.create({
      data: { ...x, trackingNo, events: { create: { status: 'BOOKED', location: x.originPort, note: 'تم تسجيل الشحنة وحجزها' } } },
    });
    await logActivity(user, 'أضاف شحنة جديدة', 'shipment', s.id, `${trackingNo} · ${s.originPort} ← ${s.destPort}`);
  }
  revalidatePath('/shipments');
  redirect(`/shipments/${s.id}`);
}

export async function addShipmentEvent(formData) {
  const user = await requireAccess('shipments');
  const id = Number(formData.get('id'));
  const status = formData.get('status');
  const at = formData.get('at') ? new Date(formData.get('at')) : new Date();
  const patch = { status };
  if (['DEPARTED', 'IN_TRANSIT'].includes(status)) patch.atd = at;
  if (status === 'ARRIVED') patch.ata = at;
  const s = await db.shipment.findUnique({ where: { id } });
  if (patch.atd && s.atd) delete patch.atd;
  if (formData.get('eta')) patch.eta = new Date(formData.get('eta'));
  await db.shipment.update({
    where: { id },
    data: { ...patch, events: { create: { status, location: str(formData.get('location')), note: str(formData.get('note')), at } } },
  });
  await logActivity(user, `حدّث حالة الشحنة إلى «${SHIP_STATUS[status]?.label}»`, 'shipment', id, s.trackingNo);
  revalidatePath(`/shipments/${id}`);
}

export async function deleteShipment(formData) {
  const user = await requireAccess('shipments');
  const id = Number(formData.get('id'));
  const s = await db.shipment.delete({ where: { id } });
  await logActivity(user, 'حذف شحنة', 'shipment', id, s.trackingNo);
  redirect('/shipments');
}
