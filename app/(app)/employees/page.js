import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { post } from '@/lib/ledger';
import { PageHeader, Table, Empty, Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { money, date, num, str } from '@/lib/format';
import { OPEN_STATUSES } from '@/lib/constants';

async function saveEmployee(formData) {
  'use server';
  await requireAccess('employees');
  const id = Number(formData.get('id') || 0);
  const data = {
    name: str(formData.get('name')) || 'موظف',
    jobTitle: str(formData.get('jobTitle')),
    phone: str(formData.get('phone')),
    salary: num(formData.get('salary')),
  };
  if (id) await db.employee.update({ where: { id }, data });
  else await db.employee.create({ data });
  revalidatePath('/employees');
}

async function toggleEmployee(formData) {
  'use server';
  await requireAccess('employees');
  const e = await db.employee.findUnique({ where: { id: Number(formData.get('id')) } });
  await db.employee.update({ where: { id: e.id }, data: { active: !e.active } });
  revalidatePath('/employees');
}

async function paySalary(formData) {
  'use server';
  await requireAccess('employees');
  const employeeId = Number(formData.get('employeeId'));
  const amount = num(formData.get('amount'));
  const month = formData.get('month');
  if (amount <= 0) return;
  const emp = await db.employee.findUnique({ where: { id: employeeId } });
  await db.$transaction(async (tx) => {
    const sp = await tx.salaryPayment.create({ data: { employeeId, amount, month, notes: str(formData.get('notes')) } });
    await post(tx, {
      currency: 'USD',
      description: `راتب ${emp.name} عن ${month}`,
      refType: 'SALARY',
      refId: sp.id,
      lines: [
        { account: 'SALARIES', debit: amount },
        { account: 'CASH', credit: amount },
      ],
    });
  });
  revalidatePath('/employees');
}

export default async function EmployeesPage() {
  await requireAccess('employees');
  const [emps, salaries] = await Promise.all([
    db.employee.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: { declarations: { where: { status: { in: OPEN_STATUSES } }, select: { id: true } }, user: true },
    }),
    db.salaryPayment.findMany({ include: { employee: true }, orderBy: { id: 'desc' }, take: 50 }),
  ]);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <>
      <PageHeader title="الموظفون والرواتب" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table head={['الاسم', 'الوظيفة', 'الهاتف', 'الراتب ($)', 'معاملات مفتوحة', 'مستخدم النظام', 'الحالة', '']}>
            {emps.map((e) => (
              <tr key={e.id} className={e.active ? '' : 'opacity-50'}>
                <td className="font-semibold">{e.name}</td>
                <td>{e.jobTitle || '—'}</td>
                <td dir="ltr" className="text-right">{e.phone || '—'}</td>
                <td>{money(e.salary)}</td>
                <td>{e.declarations.length}</td>
                <td>{e.user?.username || '—'}</td>
                <td>{e.active ? 'فعّال' : 'متوقف'}</td>
                <td>
                  <form action={toggleEmployee}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="text-xs link">{e.active ? 'إيقاف' : 'تفعيل'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
          {!emps.length && <Empty />}

          <h2 className="mb-3 mt-8">آخر الرواتب المدفوعة</h2>
          <Table head={['التاريخ', 'الموظف', 'الشهر', 'المبلغ', 'ملاحظات']}>
            {salaries.map((s) => (
              <tr key={s.id}>
                <td>{date(s.createdAt)}</td>
                <td>{s.employee.name}</td>
                <td>{s.month}</td>
                <td className="font-bold">{money(s.amount)}</td>
                <td>{s.notes || '—'}</td>
              </tr>
            ))}
          </Table>
          {!salaries.length && <Empty />}
        </div>

        <div className="space-y-6">
          <form action={saveEmployee} className="card space-y-3">
            <h2>إضافة موظف</h2>
            <Field label="الاسم"><input name="name" className="input" required /></Field>
            <Field label="الوظيفة"><input name="jobTitle" className="input" placeholder="مخلّص، محاسب، معقّب..." /></Field>
            <Field label="الهاتف"><input name="phone" className="input" dir="ltr" /></Field>
            <Field label="الراتب الشهري ($)"><input name="salary" type="number" step="any" className="input" /></Field>
            <SubmitButton className="btn-primary w-full">حفظ</SubmitButton>
          </form>
          <form action={paySalary} className="card space-y-3">
            <h2>صرف راتب</h2>
            <Field label="الموظف">
              <select name="employeeId" className="input" required>
                {emps.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name} ({money(e.salary)})</option>)}
              </select>
            </Field>
            <Field label="الشهر"><input name="month" type="month" className="input" defaultValue={month} /></Field>
            <Field label="المبلغ ($)"><input name="amount" type="number" step="any" className="input" required /></Field>
            <Field label="ملاحظات"><input name="notes" className="input" placeholder="سلفة، مكافأة..." /></Field>
            <SubmitButton className="btn-success w-full">صرف من الصندوق</SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
