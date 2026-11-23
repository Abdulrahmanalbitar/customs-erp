import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ship, Share2, Pencil, MapPin, Clock, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Badge, Options, Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import RouteMap from '@/components/RouteMap';
import { date, dateTime } from '@/lib/format';
import { SHIP_STATUS, SHIP_MODES, SHIP_STEPS } from '@/lib/constants';
import { shipProgress, daysLeft } from '@/lib/shipping';
import ShipmentForm from '../ShipmentForm';
import { addShipmentEvent, deleteShipment } from '../actions';

export default async function ShipmentPage({ params, searchParams }) {
  await requireAccess('shipments');
  const s = await db.shipment.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, declaration: true, events: { orderBy: { at: 'desc' } } },
  });
  if (!s) notFound();

  if (searchParams?.edit) {
    const [clients, declarations] = await Promise.all([
      db.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      db.declaration.findMany({ include: { client: true }, orderBy: { id: 'desc' }, take: 200 }),
    ]);
    return (
      <>
        <PageHeader title={`تعديل الشحنة ${s.trackingNo}`} icon={Ship} />
        <ShipmentForm s={s} clients={clients} declarations={declarations} />
      </>
    );
  }

  const p = shipProgress(s);
  const dl = daysLeft(s);
  const step = SHIP_STATUS[s.status]?.step ?? 0;
  const info = [
    ['العميل', <Link key="c" href={`/clients/${s.clientId}`} className="link">{s.client.name}</Link>],
    ['المعاملة', s.declaration ? <Link key="d" href={`/declarations/${s.declaration.id}`} className="link">{s.declaration.refNo}</Link> : '—'],
    ['نوع الشحن', SHIP_MODES[s.mode]],
    ['الناقل', s.carrier || '—'],
    ['السفينة / الرحلة', [s.vessel, s.voyage].filter(Boolean).join(' / ') || '—'],
    ['البوليصة', s.blNo || '—'],
    ['الحاوية', [s.containerNo, s.containerType].filter(Boolean).join(' · ') || '—'],
    ['البضاعة', s.goods || '—'],
    ['الوزن', s.weight ? `${s.weight.toLocaleString()} كغ` : '—'],
    ['ETD / ATD', `${date(s.etd)} / ${date(s.atd)}`],
    ['ETA / ATA', `${date(s.eta)} / ${date(s.ata)}`],
  ];

  return (
    <>
      <PageHeader title={<span className="font-mono">{s.trackingNo}</span>} subtitle={<Badge map={SHIP_STATUS} value={s.status} />} icon={Ship}>
        <Link href={`/track?code=${s.trackingNo}`} target="_blank" className="btn-secondary"><Share2 className="h-4 w-4" /> رابط التتبع للعميل</Link>
        <Link href={`/shipments/${s.id}?edit=1`} className="btn-secondary"><Pencil className="h-4 w-4" /> تعديل</Link>
        <form action={deleteShipment}>
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton className="btn-ghost text-red-600" confirm="حذف الشحنة نهائياً؟"><Trash2 className="h-4 w-4" /></SubmitButton>
        </form>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RouteMap origin={s.originPort} dest={s.destPort} progress={p} mode={s.mode} height={300} />
          <div className="card">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2>مراحل الشحنة</h2>
              {dl !== null && <span className={`badge ${dl < 0 ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand-700'}`}>{dl < 0 ? `متأخرة ${-dl} يوم عن ETA` : `الوصول المتوقع بعد ${dl} يوم`}</span>}
            </div>
            <div className="flex items-start overflow-x-auto pb-2">
              {SHIP_STEPS.map((label, i) => (
                <div key={label} className="flex min-w-[5.5rem] flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : i <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-gold-400 text-ink-900 ring-4 ring-gold-400/30' : 'bg-slate-100 text-slate-400 dark:bg-white/10'
                    }`}>{i < step ? '✓' : i + 1}</div>
                    <div className={`h-0.5 flex-1 ${i === SHIP_STEPS.length - 1 ? 'opacity-0' : i < step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                  </div>
                  <div className={`mt-2 text-[11px] ${i <= step ? 'font-semibold' : 'text-slate-400'}`}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/5">
                <span className="text-slate-500">{k}</span><span className="text-left font-semibold">{v}</span>
              </div>
            ))}
            {s.notes && <div className="text-slate-600 sm:col-span-2">📝 {s.notes}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <form action={addShipmentEvent} className="card space-y-3">
            <h2>إضافة حدث / تحديث الحالة</h2>
            <input type="hidden" name="id" value={s.id} />
            <Field label="الحالة"><select name="status" className="input" defaultValue={s.status}><Options map={SHIP_STATUS} /></select></Field>
            <Field label="الموقع"><input name="location" className="input" placeholder="ميناء، مدينة، نقطة عبور..." /></Field>
            <Field label="ملاحظة"><input name="note" className="input" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="تاريخ الحدث"><input name="at" type="datetime-local" className="input" /></Field>
              <Field label="ETA جديد (اختياري)"><input name="eta" type="date" className="input" /></Field>
            </div>
            <SubmitButton className="btn-primary w-full">حفظ التحديث</SubmitButton>
          </form>
          <div className="card">
            <h2 className="mb-4">سجل الأحداث</h2>
            <ol className="relative space-y-5 border-r-2 border-slate-100 pr-5 dark:border-white/10">
              {s.events.map((e, i) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -right-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${i === 0 ? 'bg-gold-400 ring-4 ring-gold-400/25' : 'bg-brand-500'}`} />
                  <Badge map={SHIP_STATUS} value={e.status} />
                  {e.location && <div className="mt-1 flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5 text-slate-400" />{e.location}</div>}
                  {e.note && <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{e.note}</div>}
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" />{dateTime(e.at)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
