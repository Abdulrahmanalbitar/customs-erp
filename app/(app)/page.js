import Link from 'next/link';
import {
  FileStack, Ship, Wallet, TrendingUp, TriangleAlert, CreditCard, Plus, Anchor, Clock, Sparkles, FileWarning, Plane, Truck,
} from 'lucide-react';
import { db } from '@/lib/db';
import { requireAccess, can } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai';
import { getT } from '@/lib/i18n';
import TodayBrief from '@/components/TodayBrief';
import { getAlerts } from '@/lib/alerts';
import { Stat, Badge, Empty, Progress, Section } from '@/components/ui';
import OceanHero from '@/components/OceanHero';
import CountUp from '@/components/CountUp';
import { RevenueChart, DonutChart } from '@/components/charts';
import { money, date, dateTime } from '@/lib/format';
import { DECL_STATUS, OPEN_STATUSES, SHIP_STATUS, SHIP_ACTIVE } from '@/lib/constants';
import { shipProgress, daysLeft } from '@/lib/shipping';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['كانون٢', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين١', 'تشرين٢', 'كانون١'];
const MODE_ICON = { SEA: Ship, AIR: Plane, LAND: Truck };

export default async function Dashboard({ searchParams }) {
  const user = await requireAccess('dashboard');
  const { t, lang } = await getT();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [openCount, releasedMonth, todayPays, dueInv, recent, missingDocs, byStatus, ships, journal, alerts, activity] = await Promise.all([
    db.declaration.count({ where: { status: { in: OPEN_STATUSES } } }),
    db.declaration.count({ where: { releasedAt: { gte: monthStart } } }),
    db.payment.groupBy({ by: ['currency'], where: { createdAt: { gte: dayStart } }, _sum: { amount: true } }),
    db.invoice.findMany({ where: { status: { in: ['UNPAID', 'PARTIAL'] } }, select: { total: true, paid: true, currency: true } }),
    db.declaration.findMany({ where: { status: { in: OPEN_STATUSES } }, include: { client: true, employee: true }, orderBy: { id: 'desc' }, take: 6 }),
    db.document.count({ where: { received: false, declaration: { status: { in: OPEN_STATUSES } } } }),
    db.declaration.groupBy({ by: ['status'], where: { status: { in: OPEN_STATUSES } }, _count: true }),
    db.shipment.findMany({ where: { status: { in: SHIP_ACTIVE } }, include: { client: true }, orderBy: { eta: 'asc' }, take: 6 }),
    db.journalEntry.findMany({ where: { date: { gte: sixAgo }, currency: 'USD', account: { in: ['REVENUE', 'EXPENSE', 'SALARIES', 'CASH', 'BANK'] } } }),
    getAlerts(),
    db.activityLog.findMany({ orderBy: { id: 'desc' }, take: 6 }),
  ]);
  const overdueCount = alerts.filter((a) => a.icon === 'money').length;
  const lateShips = alerts.filter((a) => a.icon === 'alert').length;

  const pay = (c) => todayPays.find((x) => x.currency === c)?._sum.amount || 0;
  const due = (c) => dueInv.filter((i) => i.currency === c).reduce((s, i) => s + i.total - i.paid, 0);
  const series = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const inM = journal.filter((j) => j.date >= d && j.date < e);
    const sum = (acc, f) => inM.filter((j) => acc.includes(j.account)).reduce((s, j) => s + f(j), 0);
    return {
      m: (lang === 'en' ? MONTHS_EN : MONTHS)[d.getMonth()],
      الإيرادات: Math.round(sum(['REVENUE'], (j) => j.credit - j.debit)),
      المقبوضات: Math.round(inM.filter((j) => ['CASH', 'BANK'].includes(j.account) && j.refType === 'PAYMENT').reduce((s, j) => s + j.debit, 0)),
      المصاريف: Math.round(sum(['EXPENSE', 'SALARIES'], (j) => j.debit - j.credit)),
    };
  });
  const monthRev = series.at(-1).الإيرادات;
  const prevRev = series.at(-2).الإيرادات;
  const trend = prevRev ? Math.round(((monthRev - prevRev) / prevRev) * 100) : null;
  const showMoney = can(user, 'invoices');
  const atSea = ships.filter((s) => ['DEPARTED', 'IN_TRANSIT', 'TRANSSHIPMENT', 'DELAYED'].includes(s.status)).length;
  const TZ = process.env.TZ_OFFICE || 'Asia/Damascus';
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(now));
  const iso = (x) => `\u2066${x}\u2069`; // keep amounts like $482.50 left-to-right inside Arabic text
  const greet = hour >= 5 && hour < 12 ? t('صباح الخير', 'Good morning') : hour >= 12 && hour < 17 ? t('نهارك سعيد', 'Good afternoon') : t('مساء الخير', 'Good evening');
  const firstName = user.name.split(' ')[0];

  // Rule-based brief (the AI button can rewrite it on demand).
  const brief = [
    t(`لديك ${openCount} معاملة قيد التنفيذ${missingDocs ? `، منها مستندات ناقصة (${missingDocs})` : ''}.`, `${openCount} declarations in progress${missingDocs ? `, ${missingDocs} documents still missing` : ''}.`),
    t(`${atSea} شحنة في البحر${lateShips ? `، ${lateShips} منها تجاوزت موعد الوصول` : ''}.`, `${atSea} shipments at sea${lateShips ? `, ${lateShips} past their ETA` : ''}.`),
    showMoney && (overdueCount
      ? t(`${overdueCount} فاتورة متأخرة أكثر من 30 يوماً، وديون العملاء ${iso(money(due('USD')))}.`, `${overdueCount} invoices overdue 30+ days; receivables ${money(due('USD'))}.`)
      : t(`لا توجد فواتير متأخرة، وديون العملاء ${iso(money(due('USD')))}.`, `No overdue invoices; receivables ${money(due('USD'))}.`)),
    showMoney && t(`مقبوضات اليوم ${iso(money(pay('USD')))} و${iso(money(pay('SYP'), 'SYP'))}.`, `Collected today ${money(pay('USD'))} and ${money(pay('SYP'), 'SYP')}.`),
  ].filter(Boolean).join(' ');

  const glassBtn = 'btn border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20';

  return (
    <>
      {searchParams?.denied && <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{t('ليس لديك صلاحية الوصول لهذه الصفحة.', "You don't have access to that page.")}</div>}

      <OceanHero>
        <div className="grid h-full gap-6 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end">
          <div className="min-w-0 animate-fade-up">
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur">
              <Anchor className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{now.toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-SY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })}</span>
            </div>
            <h1 className="!text-3xl !text-white md:!text-4xl">{greet}{t('، ', ', ')}{firstName} 👋</h1>
            <p className="mt-2 text-sm text-white/75">
              {t('هذه نظرة سريعة على مكتبك اليوم.', "Here's a quick look at your office today.")}
            </p>
            <div className="mt-4 grid max-w-md grid-cols-3 gap-2">
              {[
                [t('في البحر', 'At sea'), atSea, Ship],
                [t('قيد التنفيذ', 'In progress'), openCount, FileStack],
                [t('إفراج هذا الشهر', 'Released'), releasedMonth, Anchor],
              ].map(([l, v, I]) => (
                <div key={l} className="min-w-0 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                  <I className="mb-1 h-4 w-4 text-brand-200" />
                  <div className="font-display text-2xl font-bold"><CountUp value={v} /></div>
                  <div className="truncate text-[11px] text-white/70">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {can(user, 'pos') && <Link href="/pos" className="btn bg-white text-brand-800 hover:bg-brand-50"><CreditCard className="h-4 w-4" /> {t('نقطة البيع', 'Point of sale')} <kbd className="hidden rounded bg-brand-50 px-1.5 text-[10px] text-brand-700 sm:inline">F2</kbd></Link>}
              {can(user, 'declarations') && <Link href="/declarations/new" className={glassBtn}><Plus className="h-4 w-4" /> {t('معاملة جديدة', 'New declaration')}</Link>}
              {can(user, 'shipments') && <Link href="/shipments/new" className={glassBtn}><Ship className="h-4 w-4" /> {t('شحنة جديدة', 'New shipment')}</Link>}
            </div>
          </div>
          <div className="min-w-0 animate-fade-up [animation-delay:120ms]">
            <TodayBrief text={brief} ai={aiEnabled() && can(user, 'ai')} />
          </div>
        </div>
      </OceanHero>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat i={0} label={t('معاملات قيد التنفيذ', 'Open declarations')} count={openCount} hint={t(`${missingDocs} مستند ناقص`, `${missingDocs} missing documents`)} icon={FileStack} href="/declarations?status=OPEN" />
        <Stat i={1} label={t('شحنات نشطة', 'Active shipments')} count={ships.length} hint={t(`${atSea} في البحر الآن`, `${atSea} at sea now`)} icon={Ship} tone="violet" href="/shipments" />
        {showMoney && <Stat i={2} label={t('مقبوضات اليوم', 'Collected today')} count={pay('USD')} prefix="$" decimals={2} hint={money(pay('SYP'), 'SYP')} tone="green" icon={Wallet} href="/payments" />}
        {showMoney && (
          <Stat
            i={3}
            label={t('إيرادات الشهر', 'Revenue this month')}
            count={monthRev}
            prefix="$"
            trend={trend}
            trendLabel={t('عن الشهر الماضي', 'vs last month')}
            hint={trend === null ? t('أول شهر', 'First month') : null}
            icon={TrendingUp}
            tone={trend !== null && trend < 0 ? 'amber' : 'brand'}
          />
        )}
        {showMoney && <Stat i={4} label={t('ديون العملاء', 'Receivables')} count={due('USD')} prefix="$" decimals={2} hint={money(due('SYP'), 'SYP')} tone="red" icon={TriangleAlert} href="/invoices?status=DUE" />}
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        {showMoney && (
          <div className="card xl:col-span-2">
            <Section title={t('الأداء المالي – آخر 6 أشهر ($)', 'Financial performance – last 6 months ($)')}>
              <RevenueChart data={series} />
            </Section>
          </div>
        )}
        <div className={`card ${showMoney ? '' : 'xl:col-span-3'}`}>
          <Section title={t('المعاملات حسب المرحلة', 'Declarations by stage')}>
            <DonutChart center={t('معاملة مفتوحة', 'open')} data={OPEN_STATUSES.map((s) => ({ name: DECL_STATUS[s].label, value: byStatus.find((x) => x.status === s)?._count || 0 })).filter((x) => x.value)} />
          </Section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <div className="card xl:col-span-2">
          <Section title={t('الشحنات القادمة', 'Upcoming shipments')} action={<Link href="/shipments" className="link text-sm">{t('عرض الكل', 'View all')}</Link>}>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {ships.map((s) => {
                const Icon = MODE_ICON[s.mode] || Ship;
                const dl = daysLeft(s);
                return (
                  <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center gap-4 py-3 transition hover:opacity-80">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <b>{s.originPort}</b><span className="text-slate-400 ltr:rotate-180">←</span><b>{s.destPort}</b>
                        <Badge map={SHIP_STATUS} value={s.status} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{s.client.name} · {s.vessel || s.carrier || s.trackingNo}</div>
                      <Progress value={shipProgress(s)} className="mt-2" />
                    </div>
                    <div className="shrink-0 text-end text-xs">
                      <div className="text-slate-400">ETA</div>
                      <div className="font-semibold">{date(s.eta)}</div>
                      {dl !== null && <div className={dl < 0 ? 'text-red-500' : 'text-brand-600'}>{dl < 0 ? t(`متأخرة ${-dl} يوم`, `${-dl}d late`) : t(`بعد ${dl} يوم`, `in ${dl}d`)}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
            {!ships.length && <Empty>{t('لا توجد شحنات نشطة', 'No active shipments')}</Empty>}
          </Section>
        </div>

        <div className="card">
          <Section title={t('تنبيهات ذكية', 'Smart alerts')}>
            <div className="space-y-2">
              {alerts.slice(0, 6).map((a, i) => (
                <Link key={i} href={a.href} className={`flex gap-3 rounded-xl border p-2.5 transition hover:-translate-y-px ${a.level === 'danger' ? 'border-red-100 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5' : a.level === 'warning' ? 'border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5' : 'border-sky-100 bg-sky-50/50 dark:border-sky-500/20 dark:bg-sky-500/5'}`}>
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.level === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : a.level === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10'}`}>
                    {a.icon === 'ship' ? <Ship className="h-4 w-4" /> : a.icon === 'file' ? <FileWarning className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{a.title}</span>
                    <span className="block truncate text-xs text-slate-500">{a.text}</span>
                  </span>
                </Link>
              ))}
              {!alerts.length && <Empty>{t('كل شيء تحت السيطرة ✨', 'All under control ✨')}</Empty>}
            </div>
          </Section>
        </div>

        <div className="card xl:col-span-2">
          <Section title={t('آخر المعاملات المفتوحة', 'Latest open declarations')} action={<Link href="/board" className="link text-sm">{t('لوحة سير العمل', 'Workflow board')}</Link>}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>{t('المرجع', 'Ref')}</th><th>{t('العميل', 'Client')}</th><th>{t('البضاعة', 'Goods')}</th><th>{t('المخلّص', 'Agent')}</th><th>{t('الحالة', 'Status')}</th><th>{t('التاريخ', 'Date')}</th></tr></thead>
                <tbody>
                  {recent.map((d) => (
                    <tr key={d.id}>
                      <td><Link className="link font-mono text-xs" href={`/declarations/${d.id}`}>{d.refNo}</Link></td>
                      <td>{d.client.name}</td>
                      <td className="max-w-[12rem] truncate">{d.goods || '—'}</td>
                      <td>{d.employee?.name || '—'}</td>
                      <td><Badge map={DECL_STATUS} value={d.status} /></td>
                      <td className="whitespace-nowrap text-xs text-slate-500">{date(d.openedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!recent.length && <Empty />}
          </Section>
        </div>

        <div className="card">
          <Section title={t('آخر النشاطات', 'Recent activity')}>
            <ol className="relative space-y-4 border-s border-slate-200 ps-4 dark:border-white/10">
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-ink-800" />
                  <div className="text-sm"><b>{a.userName || t('النظام', 'System')}</b> {a.action}</div>
                  {a.details && <div className="truncate text-xs text-slate-500">{a.details}</div>}
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" />{dateTime(a.createdAt)}</div>
                </li>
              ))}
            </ol>
            {!activity.length && <Empty>{t('لا يوجد نشاط بعد', 'No activity yet')}</Empty>}
          </Section>
        </div>
      </div>
    </>
  );
}
