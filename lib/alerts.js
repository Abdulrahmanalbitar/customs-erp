import { db } from './db';
import { OPEN_STATUSES, SHIP_ACTIVE } from './constants';

const DAY = 864e5;

/** Smart alerts computed live from data. */
export async function getAlerts() {
  const now = Date.now();
  const [arriving, late, stuckDocs, overdue, urgent] = await Promise.all([
    db.shipment.findMany({
      where: { status: { in: SHIP_ACTIVE }, ata: null, eta: { gte: new Date(now), lte: new Date(now + 3 * DAY) } },
      include: { client: true },
      take: 10,
    }),
    db.shipment.findMany({
      where: { status: { in: ['BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'TRANSSHIPMENT', 'DELAYED'] }, eta: { lt: new Date(now) } },
      include: { client: true },
      take: 10,
    }),
    db.declaration.findMany({
      where: { status: { in: OPEN_STATUSES }, openedAt: { lt: new Date(now - 3 * DAY) }, documents: { some: { received: false } } },
      include: { client: true, documents: { where: { received: false } } },
      take: 10,
    }),
    db.invoice.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] }, createdAt: { lt: new Date(now - 30 * DAY) } },
      include: { client: true },
      take: 10,
    }),
    db.declaration.findMany({
      where: { status: { in: OPEN_STATUSES }, OR: [{ priority: 'URGENT' }, { dueDate: { lt: new Date(now + DAY) } }] },
      include: { client: true },
      take: 10,
    }),
  ]);

  const alerts = [];
  for (const s of arriving)
    alerts.push({ level: 'info', icon: 'ship', title: `شحنة ${s.trackingNo} تصل خلال أيام`, text: `${s.client.name} · ${s.destPort}`, href: `/shipments/${s.id}`, at: s.eta });
  for (const s of late)
    alerts.push({ level: 'danger', icon: 'alert', title: `شحنة ${s.trackingNo} تجاوزت موعد الوصول`, text: `${s.client.name} · ETA ${new Date(s.eta).toLocaleDateString('en-GB')}`, href: `/shipments/${s.id}`, at: s.eta });
  for (const d of stuckDocs)
    alerts.push({ level: 'warning', icon: 'file', title: `مستندات ناقصة – ${d.refNo}`, text: `${d.client.name} · ${d.documents.map((x) => x.kind).join('، ')}`, href: `/declarations/${d.id}`, at: d.openedAt });
  for (const i of overdue)
    alerts.push({ level: 'warning', icon: 'money', title: `فاتورة متأخرة ${i.number}`, text: `${i.client.name} · متبقي ${(i.total - i.paid).toFixed(0)} ${i.currency}`, href: `/invoices/${i.id}`, at: i.createdAt });
  for (const d of urgent)
    alerts.push({ level: 'danger', icon: 'flag', title: `معاملة عاجلة ${d.refNo}`, text: d.client.name, href: `/declarations/${d.id}`, at: d.dueDate || d.openedAt });
  return alerts;
}
