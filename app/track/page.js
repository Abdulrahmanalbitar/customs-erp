import { Anchor, Search, MapPin, Clock, Ship } from 'lucide-react';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import RouteMap from '@/components/RouteMap';
import { SHIP_STATUS, SHIP_MODES, SHIP_STEPS } from '@/lib/constants';
import { shipProgress, daysLeft } from '@/lib/shipping';
import { date, dateTime } from '@/lib/format';

export const metadata = { title: 'تتبع شحنتك' };

// Public page: customers track by code. Shows only shipment progress, never financial data.
export default async function TrackPage({ searchParams }) {
  const code = String(searchParams?.code || '').trim().toUpperCase();
  const s = await getSettings();
  const ship = code
    ? await db.shipment.findUnique({ where: { trackingNo: code }, include: { events: { orderBy: { at: 'desc' } } } })
    : null;
  const step = ship ? SHIP_STATUS[ship.status]?.step ?? 0 : 0;
  const dl = ship ? daysLeft(ship) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-900 via-brand-950 to-ink-900 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow"><Anchor className="h-6 w-6" /></div>
          <div>
            <div className="font-display text-xl font-bold">{s.officeName}</div>
            <div className="text-sm text-white/60">تتبع شحنتك لحظة بلحظة</div>
          </div>
        </div>
        <form className="mb-8 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
          <input name="code" defaultValue={code} placeholder="أدخل رقم التتبع، مثال: TRK26AB12CD" className="h-12 flex-1 bg-transparent px-3 font-mono text-lg outline-none placeholder:font-sans placeholder:text-base placeholder:text-white/40" dir="ltr" />
          <button className="btn-primary h-12 px-6"><Search className="h-4 w-4" /> تتبع</button>
        </form>

        {code && !ship && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">لم يتم العثور على شحنة بهذا الرقم. تأكد من الرقم أو تواصل معنا.</div>}

        {ship && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-2xl font-bold">{ship.trackingNo}</div>
                  <div className="text-sm text-white/60">{SHIP_MODES[ship.mode]} · {ship.goods || 'بضائع'}</div>
                </div>
                <div className="text-left">
                  <div className="rounded-full bg-gold-400 px-4 py-1.5 text-sm font-bold text-ink-900">{SHIP_STATUS[ship.status]?.label}</div>
                  {dl !== null && <div className="mt-1 text-xs text-white/70">{dl < 0 ? 'تأخير في الوصول' : `الوصول المتوقع بعد ${dl} يوم`}</div>}
                </div>
              </div>
              <RouteMap origin={ship.originPort} dest={ship.destPort} progress={shipProgress(ship)} mode={ship.mode} />
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                {[['من', ship.originPort], ['إلى', ship.destPort], ['المغادرة', date(ship.atd || ship.etd)], ['الوصول المتوقع', date(ship.ata || ship.eta)]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/5 p-3"><div className="text-xs text-white/50">{k}</div><div className="font-semibold">{v}</div></div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-6 flex overflow-x-auto pb-2">
                {SHIP_STEPS.map((l, i) => (
                  <div key={l} className="flex min-w-[5rem] flex-1 flex-col items-center text-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < step ? 'bg-brand-500' : i === step ? 'bg-gold-400 text-ink-900 ring-4 ring-gold-400/30' : 'bg-white/10 text-white/40'}`}>{i < step ? '✓' : i + 1}</div>
                    <div className={`mt-2 text-[11px] ${i <= step ? '' : 'text-white/40'}`}>{l}</div>
                  </div>
                ))}
              </div>
              <ol className="space-y-4 border-r-2 border-white/10 pr-5">
                {ship.events.map((e, i) => (
                  <li key={e.id} className="relative">
                    <span className={`absolute -right-[27px] top-1 h-4 w-4 rounded-full ${i === 0 ? 'bg-gold-400' : 'bg-brand-500'}`} />
                    <div className="font-semibold">{SHIP_STATUS[e.status]?.label}</div>
                    {e.location && <div className="flex items-center gap-1 text-sm text-white/70"><MapPin className="h-3.5 w-3.5" />{e.location}</div>}
                    {e.note && <div className="text-sm text-white/70">{e.note}</div>}
                    <div className="flex items-center gap-1 text-xs text-white/40"><Clock className="h-3 w-3" />{dateTime(e.at)}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
        {!code && (
          <div className="py-16 text-center text-white/50"><Ship className="mx-auto mb-3 h-12 w-12 opacity-40" />أدخل رقم التتبع الذي أرسله لك المكتب</div>
        )}
        <div className="mt-10 text-center text-xs text-white/40">{s.officePhone && <span dir="ltr">{s.officePhone}</span>} {s.officeAddress && `· ${s.officeAddress}`}</div>
      </div>
    </div>
  );
}
