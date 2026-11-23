import Link from 'next/link';
import CountUp from './CountUp';

export function PageHeader({ title, subtitle, children, icon: Icon }) {
  return (
    <div className="mb-6 flex animate-fade-up flex-wrap items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Badge({ map, value }) {
  const s = map[value] || { label: value, color: 'bg-slate-100 text-slate-700' };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

const TONES = {
  brand: { text: 'text-slate-900 dark:text-white', icon: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300', bar: 'bg-brand-500' },
  green: { text: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300', bar: 'bg-emerald-500' },
  red: { text: 'text-red-700 dark:text-red-300', icon: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300', bar: 'bg-red-500' },
  amber: { text: 'text-amber-700 dark:text-amber-300', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300', bar: 'bg-amber-500' },
  violet: { text: 'text-violet-700 dark:text-violet-300', icon: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300', bar: 'bg-violet-500' },
};

/**
 * KPI card: coloured top accent, optional count-up number (pass `count` instead of `value`),
 * trend line (`trend` = signed %, `trendLabel`), hover lift and staggered rise (`i`).
 */
export function Stat({ label, value, count, prefix, suffix, decimals, hint, tone = 'brand', icon: Icon, href, trend, trendLabel, i = 0 }) {
  const t = TONES[tone] || TONES.brand;
  const body = (
    <div className="card card-hover relative h-full animate-fade-up overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
      <span className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.icon}`}><Icon className="h-[18px] w-[18px]" /></span>}
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${t.text}`}>
        {count !== undefined ? <CountUp value={count} prefix={prefix} suffix={suffix} decimals={decimals} /> : value}
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`mt-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend >= 0 ? '▲' : '▼'} <bdi className="num">{Math.abs(trend)}%</bdi> {trendLabel}
        </div>
      )}
      {hint && <div className="mt-1 truncate text-xs text-slate-400">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Empty({ children = 'لا توجد بيانات بعد' }) {
  return <div className="p-10 text-center text-sm text-slate-400">{children}</div>;
}

export function Table({ head, children }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="table">
        <thead>
          <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function SearchBar({ q, placeholder = 'بحث...', children }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2 no-print">
      <input name="q" defaultValue={q || ''} placeholder={placeholder} className="input max-w-xs" />
      {children}
      <button className="btn-secondary">بحث</button>
    </form>
  );
}

export function LinkButton({ href, children, kind = 'primary' }) {
  return <Link href={href} className={`btn-${kind}`}>{children}</Link>;
}

export function Options({ map, all }) {
  return (
    <>
      {all && <option value="">{all}</option>}
      {Object.entries(map).map(([k, v]) => (
        <option key={k} value={k}>{typeof v === 'string' ? v : v.label}</option>
      ))}
    </>
  );
}

export function Section({ title, action, children, className = '' }) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Progress({ value, className = '' }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10 ${className}`}>
      <div className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
