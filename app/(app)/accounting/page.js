import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { post } from '@/lib/ledger';
import { PageHeader, Table, Empty, Options, Field, Stat } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { money, dateTime, num, str } from '@/lib/format';
import { ACCOUNTS, CURRENCIES } from '@/lib/constants';

const EXTRA = { CAPITAL: 'رأس المال / جاري الشريك' };
const ALL = { ...ACCOUNTS, ...EXTRA };
const REF = { INVOICE: 'فاتورة', PAYMENT: 'قبض', EXPENSE: 'مصروف', SALARY: 'راتب', MANUAL: 'يدوي' };

async function manualEntry(formData) {
  'use server';
  await requireAccess('accounting');
  const amount = num(formData.get('amount'));
  const debit = formData.get('debit');
  const credit = formData.get('credit');
  if (amount <= 0 || debit === credit) return;
  await post(null, {
    currency: formData.get('currency'),
    description: str(formData.get('description')) || 'قيد يدوي',
    refType: 'MANUAL',
    lines: [
      { account: debit, debit: amount },
      { account: credit, credit: amount },
    ],
  });
  revalidatePath('/accounting');
}

export default async function AccountingPage({ searchParams }) {
  await requireAccess('accounting');
  const account = searchParams?.account || '';
  const currency = searchParams?.currency || '';
  const [groups, entries] = await Promise.all([
    db.journalEntry.groupBy({ by: ['account', 'currency'], _sum: { debit: true, credit: true } }),
    db.journalEntry.findMany({
      where: { ...(account ? { account } : {}), ...(currency ? { currency } : {}) },
      orderBy: { id: 'desc' },
      take: 300,
    }),
  ]);
  const bal = (acc, cur) => {
    const g = groups.find((x) => x.account === acc && x.currency === cur);
    return g ? (g._sum.debit || 0) - (g._sum.credit || 0) : 0;
  };

  return (
    <>
      <PageHeader title="المحاسبة" subtitle="قيود اليومية تُنشأ تلقائياً من الفواتير والمقبوضات والمصاريف والرواتب" />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="الصندوق $" value={money(bal('CASH', 'USD'), 'USD')} tone="green" />
        <Stat label="الصندوق ل.س" value={money(bal('CASH', 'SYP'), 'SYP')} tone="green" />
        <Stat label="البنك $" value={money(bal('BANK', 'USD'), 'USD')} />
        <Stat label="ذمم العملاء $" value={money(bal('RECEIVABLE', 'USD'), 'USD')} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3">ميزان المراجعة</h2>
          <Table head={['الحساب', 'رصيد $', 'رصيد ل.س']}>
            {Object.entries(ALL).map(([k, v]) => (
              <tr key={k}>
                <td><a className="link" href={`?account=${k}`}>{v}</a></td>
                <td>{money(bal(k, 'USD'), 'USD')}</td>
                <td>{money(bal(k, 'SYP'), 'SYP')}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-slate-500">الرصيد = مدين − دائن. الإيرادات تظهر بالسالب (طبيعتها دائنة).</p>
        </div>
        <form action={manualEntry} className="card space-y-3">
          <h2>قيد يدوي</h2>
          <Field label="من حساب (مدين)"><select name="debit" className="input"><Options map={ALL} /></select></Field>
          <Field label="إلى حساب (دائن)"><select name="credit" className="input" defaultValue="CAPITAL"><Options map={ALL} /></select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المبلغ"><input name="amount" type="number" step="any" className="input" required /></Field>
            <Field label="العملة"><select name="currency" className="input"><Options map={CURRENCIES} /></select></Field>
          </div>
          <Field label="البيان"><input name="description" className="input" placeholder="رصيد افتتاحي، إيداع بنكي..." /></Field>
          <SubmitButton className="btn-primary w-full">ترحيل القيد</SubmitButton>
        </form>
      </div>

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2>دفتر اليومية {account && `– ${ALL[account]}`}</h2>
        <form className="flex gap-2 no-print">
          <select name="account" className="input" defaultValue={account}><Options map={ALL} all="كل الحسابات" /></select>
          <select name="currency" className="input" defaultValue={currency}><Options map={CURRENCIES} all="كل العملات" /></select>
          <button className="btn-secondary">تصفية</button>
        </form>
      </div>
      <Table head={['التاريخ', 'الحساب', 'البيان', 'المصدر', 'مدين', 'دائن']}>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className="whitespace-nowrap">{dateTime(e.date)}</td>
            <td>{ALL[e.account] || e.account}</td>
            <td>{e.description}</td>
            <td>{REF[e.refType] || '—'}</td>
            <td>{e.debit ? money(e.debit, e.currency) : ''}</td>
            <td>{e.credit ? money(e.credit, e.currency) : ''}</td>
          </tr>
        ))}
      </Table>
      {!entries.length && <Empty />}
    </>
  );
}
