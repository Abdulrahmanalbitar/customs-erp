import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Stat, Empty } from '@/components/ui';
import { PrintButton } from '@/components/buttons';
import { BarsChart, DonutChart } from '@/components/charts';
import { BarChart3 } from 'lucide-react';
import { money } from '@/lib/format';
import { DECL_STATUS, DECL_TYPES, CURRENCIES } from '@/lib/constants';

export default async function ReportsPage({ searchParams }) {
  await requireAccess('reports');
  const today = new Date();
  const fromS = searchParams?.from || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const toS = searchParams?.to || today.toISOString().slice(0, 10);
  const cur = searchParams?.currency || 'USD';
  const range = { gte: new Date(fromS), lt: new Date(new Date(toS).getTime() + 864e5) };

  const [journal, invoices, decls, dueInvoices] = await Promise.all([
    db.journalEntry.findMany({ where: { date: range, currency: cur } }),
    db.invoice.findMany({ where: { createdAt: range, currency: cur, status: { not: 'VOID' } }, include: { client: true, declaration: { include: { employee: true } } } }),
    db.declaration.findMany({ where: { openedAt: range }, include: { employee: true } }),
    db.invoice.findMany({ where: { currency: cur, status: { in: ['UNPAID', 'PARTIAL'] } }, include: { client: true } }),
  ]);

  const sum = (acc, side) => journal.filter((j) => j.account === acc).reduce((s, j) => s + j[side], 0);
  const revenue = sum('REVENUE', 'credit') - sum('REVENUE', 'debit');
  const expenses = sum('EXPENSE', 'debit') - sum('EXPENSE', 'credit');
  const salaries = sum('SALARIES', 'debit') - sum('SALARIES', 'credit');
  const collected = journal.filter((j) => (j.account === 'CASH' || j.account === 'BANK') && j.refType === 'PAYMENT').reduce((s, j) => s + j.debit, 0);
  const profit = revenue - expenses - salaries;

  // revenue by client
  const byClient = {};
  for (const i of invoices) {
    byClient[i.client.name] ??= { total: 0, paid: 0, count: 0 };
    byClient[i.client.name].total += i.total;
    byClient[i.client.name].paid += i.paid;
    byClient[i.client.name].count++;
  }
  // aging of receivables
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '+90': 0 };
  const agingByClient = {};
  for (const i of dueInvoices) {
    const days = (Date.now() - new Date(i.createdAt)) / 864e5;
    const k = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '+90';
    const due = i.total - i.paid;
    aging[k] += due;
    agingByClient[i.client.name] = (agingByClient[i.client.name] || 0) + due;
  }
  // declarations by status / type / employee
  const count = (arr, key) => arr.reduce((m, x) => ((m[key(x)] = (m[key(x)] || 0) + 1), m), {});
  const byStatus = count(decls, (d) => d.status);
  const byType = count(decls, (d) => d.type);
  const byEmp = count(decls, (d) => d.employee?.name || 'غير محدد');

  return (
    <>
      <PageHeader icon={BarChart3} title="التقارير والتحليلات" subtitle={`من ${fromS} إلى ${toS} — ${CURRENCIES[cur]}`}>
        <PrintButton />
      </PageHeader>
      <form className="card mb-6 flex flex-wrap items-end gap-3 no-print">
        <div><label>من</label><input type="date" name="from" defaultValue={fromS} className="input" /></div>
        <div><label>إلى</label><input type="date" name="to" defaultValue={toS} className="input" /></div>
        <div>
          <label>العملة</label>
          <select name="currency" defaultValue={cur} className="input">{Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <button className="btn-primary">عرض التقرير</button>
      </form>

      <h2 className="mb-3">قائمة الدخل</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-5">
        <Stat label="إيرادات الخدمات" value={money(revenue, cur)} tone="green" />
        <Stat label="المصاريف التشغيلية" value={money(expenses, cur)} tone="red" />
        <Stat label="الرواتب" value={money(salaries, cur)} tone="red" />
        <Stat label="صافي الربح" value={money(profit, cur)} tone={profit >= 0 ? 'green' : 'red'} />
        <Stat label="المحصّل نقداً وتحويلاً" value={money(collected, cur)} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3">أفضل العملاء حسب المبيعات</h2>
          <BarsChart keys={['المبيعات', 'المحصّل']} data={Object.entries(byClient).sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([n, v]) => ({ name: n.length > 14 ? n.slice(0, 14) + '…' : n, المبيعات: Math.round(v.total), المحصّل: Math.round(v.paid) }))} />
        </div>
        <div className="card">
          <h2 className="mb-3">المعاملات حسب النوع</h2>
          <DonutChart center="معاملة" data={Object.entries(byType).map(([k, v]) => ({ name: DECL_TYPES[k], value: v }))} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3">المبيعات حسب العميل</h2>
          <Table head={['العميل', 'عدد الفواتير', 'الإجمالي', 'المحصّل']}>
            {Object.entries(byClient).sort((a, b) => b[1].total - a[1].total).map(([n, v]) => (
              <tr key={n}><td>{n}</td><td>{v.count}</td><td>{money(v.total, cur)}</td><td>{money(v.paid, cur)}</td></tr>
            ))}
          </Table>
          {!invoices.length && <Empty />}
        </div>
        <div>
          <h2 className="mb-3">أعمار الديون (كل الفترات)</h2>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {Object.entries(aging).map(([k, v]) => (
              <div key={k} className="card p-3 text-center"><div className="text-xs text-slate-500">{k} يوم</div><div className="font-bold text-red-700">{money(v, cur)}</div></div>
            ))}
          </div>
          <Table head={['العميل', 'المستحق']}>
            {Object.entries(agingByClient).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
              <tr key={n}><td>{n}</td><td className="font-bold text-red-700">{money(v, cur)}</td></tr>
            ))}
          </Table>
        </div>
        <div>
          <h2 className="mb-3">المعاملات المفتوحة خلال الفترة ({decls.length})</h2>
          <Table head={['الحالة', 'العدد']}>
            {Object.entries(byStatus).map(([k, v]) => <tr key={k}><td>{DECL_STATUS[k]?.label}</td><td>{v}</td></tr>)}
          </Table>
          <div className="mt-4" />
          <Table head={['النوع', 'العدد']}>
            {Object.entries(byType).map(([k, v]) => <tr key={k}><td>{DECL_TYPES[k]}</td><td>{v}</td></tr>)}
          </Table>
        </div>
        <div>
          <h2 className="mb-3">إنتاجية المخلّصين</h2>
          <Table head={['المخلّص', 'عدد المعاملات']}>
            {Object.entries(byEmp).sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          </Table>
        </div>
      </div>
    </>
  );
}
