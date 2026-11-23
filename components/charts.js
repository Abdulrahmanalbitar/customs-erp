'use client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { useT } from './LangProvider';

const tip = {
  contentStyle: { borderRadius: 12, border: '1px solid rgba(148,163,184,.25)', background: 'rgba(15,23,42,.92)', color: '#fff', fontSize: 12, direction: 'rtl' },
  labelStyle: { color: '#94a3b8' },
};
const fmt = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

export function RevenueChart({ data }) {
  const { t, lang } = useT();
  const rtl = lang !== 'en';
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a9bd2" stopOpacity=".45" /><stop offset="1" stopColor="#0a9bd2" stopOpacity="0" /></linearGradient>
          <linearGradient id="gCol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1fa77a" stopOpacity=".35" /><stop offset="1" stopColor="#1fa77a" stopOpacity="0" /></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" vertical={false} />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} reversed={rtl} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} orientation={rtl ? 'right' : 'left'} width={40} />
        <Tooltip {...tip} formatter={(v, n) => [`$${Number(v).toLocaleString()}`, n]} />
        <Area type="monotone" name={t('الإيرادات', 'Revenue')} dataKey="الإيرادات" stroke="#0a9bd2" strokeWidth={2.5} fill="url(#gRev)" />
        <Area type="monotone" name={t('المقبوضات', 'Collected')} dataKey="المقبوضات" stroke="#1fa77a" strokeWidth={2} fill="url(#gCol)" />
        <Area type="monotone" name={t('المصاريف', 'Expenses')} dataKey="المصاريف" stroke="#e2463f" strokeWidth={1.5} fill="transparent" strokeDasharray="4 4" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE = ['#0a9bd2', '#e8a91c', '#7c5cff', '#1fa77a', '#e2463f', '#22b9ec', '#f07c2a', '#94a3b8'];

export function DonutChart({ data, center }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
          </Pie>
          <Tooltip {...tip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-3xl font-bold">{total}</div>
        <div className="text-xs text-slate-500">{center}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />
            <span className="flex-1 truncate text-slate-500">{d.name}</span>
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarsChart({ data, keys, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} reversed />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} orientation="right" width={40} allowDecimals={false} />
        <Tooltip {...tip} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => <Bar key={k} dataKey={k} fill={PIE[i]} radius={[6, 6, 0, 0]} maxBarSize={36} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
