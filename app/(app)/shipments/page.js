import Link from 'next/link';
import { Ship, Plane, Truck, Plus, MapPin } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Badge, Empty, SearchBar, Options, Progress, Stat } from '@/components/ui';
import { date } from '@/lib/format';
import { SHIP_STATUS, SHIP_MODES, SHIP_ACTIVE } from '@/lib/constants';
import { shipProgress, daysLeft } from '@/lib/shipping';

const ICON = { SEA: Ship, AIR: Plane, LAND: Truck };

export default async function ShipmentsPage({ searchParams }) {
  await requireAccess('shipments');
  const { q, status, mode } = searchParams || {};
  const where = {};
  if (q) where.OR = [{ trackingNo: { contains: q } }, { containerNo: { contains: q } }, { blNo: { contains: q } }, { vessel: { contains: q } }, { client: { name: { contains: q } } }];
  if (status === 'ACTIVE' || !status) where.status = { in: SHIP_ACTIVE };
  else if (status !== 'ALL') where.status = status;
  if (mode) where.mode = mode;
  const [list, counts] = await Promise.all([
    db.shipment.findMany({ where, include: { client: true, declaration: true }, orderBy: [{ eta: 'asc' }], take: 200 }),
    db.shipment.groupBy({ by: ['status'], _count: true }),
  ]);
  const c = (arr) => counts.filter((x) => arr.includes(x.status)).reduce((s, x) => s + x._count, 0);

  return (
    <>
      <PageHeader title="تتبع الشحنات" subtitle="كل شحنات العملاء بحراً وجواً وبراً مع المسار وموعد الوصول" icon={Ship}>
        <Link href="/shipments/new" className="btn-primary"><Plus className="h-4 w-4" /> شحنة جديدة</Link>
        <Link href="/track" target="_blank" className="btn-secondary"><MapPin className="h-4 w-4" /> صفحة التتبع للعملاء</Link>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="قيد الحجز والتحميل" value={c(['BOOKED', 'LOADED'])} icon={Ship} />
        <Stat label="في الطريق" value={c(['DEPARTED', 'IN_TRANSIT', 'TRANSSHIPMENT'])} icon={Ship} tone="violet" />
        <Stat label="وصلت / في الجمارك" value={c(['ARRIVED', 'AT_CUSTOMS'])} icon={MapPin} tone="amber" />
        <Stat label="متأخرة" value={c(['DELAYED'])} icon={Ship} tone="red" />
      </div>
      <SearchBar q={q} placeholder="رقم تتبع، حاوية، بوليصة، سفينة، عميل...">
        <select name="status" className="input max-w-[12rem]" defaultValue={status || 'ACTIVE'}>
          <option value="ACTIVE">النشطة</option>
          <option value="ALL">الكل</option>
          <Options map={SHIP_STATUS} />
        </select>
        <select name="mode" className="input max-w-[9rem]" defaultValue={mode || ''}><Options map={SHIP_MODES} all="كل الأنواع" /></select>
      </SearchBar>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((s) => {
          const Icon = ICON[s.mode] || Ship;
          const p = shipProgress(s);
          const dl = daysLeft(s);
          return (
            <Link key={s.id} href={`/shipments/${s.id}`} className="card card-hover block">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white"><Icon className="h-5 w-5" /></span>
                  <div>
                    <div className="font-mono text-sm font-bold">{s.trackingNo}</div>
                    <div className="text-xs text-slate-500">{s.client.name}</div>
                  </div>
                </div>
                <Badge map={SHIP_STATUS} value={s.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div><div className="text-[11px] text-slate-400">من</div><b>{s.originPort}</b><div className="text-[11px] text-slate-400">{date(s.atd || s.etd)}</div></div>
                <div className="relative mx-3 flex-1">
                  <Progress value={p} />
                  <Icon className="absolute -top-2 h-5 w-5 text-brand-600 dark:text-brand-300" style={{ right: `calc(${p}% - 10px)` }} />
                </div>
                <div className="text-left"><div className="text-[11px] text-slate-400">إلى</div><b>{s.destPort}</b><div className="text-[11px] text-slate-400">{date(s.ata || s.eta)}</div></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/5">
                {s.vessel && <span className="chip">{s.vessel}</span>}
                {s.containerNo && <span className="chip">{s.containerNo}</span>}
                {s.declaration && <span className="chip">{s.declaration.refNo}</span>}
                {dl !== null && <span className={`mr-auto font-semibold ${dl < 0 ? 'text-red-500' : 'text-brand-600 dark:text-brand-300'}`}>{dl < 0 ? `متأخرة ${-dl} يوم` : dl === 0 ? 'تصل اليوم' : `تصل بعد ${dl} يوم`}</span>}
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && <div className="card"><Empty>لا توجد شحنات</Empty></div>}
    </>
  );
}
