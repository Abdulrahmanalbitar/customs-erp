import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json([]);
  const c = { contains: q };
  const [clients, decls, ships, invs] = await Promise.all([
    db.client.findMany({ where: { OR: [{ name: c }, { phone: c }, { taxNumber: c }] }, take: 5 }),
    db.declaration.findMany({ where: { OR: [{ refNo: c }, { declNo: c }, { containerNo: c }, { goods: c }, { billOfLading: c }] }, include: { client: true }, take: 6 }),
    db.shipment.findMany({ where: { OR: [{ trackingNo: c }, { containerNo: c }, { blNo: c }, { vessel: c }] }, include: { client: true }, take: 5 }),
    db.invoice.findMany({ where: { number: c }, include: { client: true }, take: 5 }),
  ]);
  return NextResponse.json([
    ...clients.map((x) => ({ type: 'عميل', title: x.name, sub: x.phone || '', href: `/clients/${x.id}` })),
    ...decls.map((x) => ({ type: 'معاملة', title: `${x.refNo} ${x.goods ? '– ' + x.goods : ''}`, sub: x.client.name, href: `/declarations/${x.id}` })),
    ...ships.map((x) => ({ type: 'شحنة', title: `${x.trackingNo} · ${x.originPort} ← ${x.destPort}`, sub: x.client.name, href: `/shipments/${x.id}` })),
    ...invs.map((x) => ({ type: 'فاتورة', title: x.number, sub: x.client.name, href: `/invoices/${x.id}` })),
  ]);
}
