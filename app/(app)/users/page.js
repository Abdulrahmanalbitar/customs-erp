import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PageHeader, Table, Options, Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { date, str, int } from '@/lib/format';
import { ROLES, ACCESS } from '@/lib/constants';

const SECTION_NAMES = {
  dashboard: 'لوحة التحكم', clients: 'العملاء', declarations: 'المعاملات', pos: 'نقطة البيع', invoices: 'الفواتير',
  payments: 'المقبوضات', expenses: 'المصاريف', employees: 'الموظفون', accounting: 'المحاسبة', reports: 'التقارير',
  users: 'المستخدمون', settings: 'الإعدادات',
};

async function createUser(formData) {
  'use server';
  await requireAccess('users');
  const username = str(formData.get('username'));
  const password = String(formData.get('password') || '');
  if (!username || password.length < 6) redirect('/users?error=short');
  if (await db.user.findUnique({ where: { username } })) redirect('/users?error=exists');
  await db.user.create({
    data: {
      username,
      name: str(formData.get('name')) || username,
      role: formData.get('role'),
      password: await bcrypt.hash(password, 10),
      employeeId: int(formData.get('employeeId')),
    },
  });
  revalidatePath('/users');
}

async function updateUser(formData) {
  'use server';
  const me = await requireAccess('users');
  const id = Number(formData.get('id'));
  const data = { role: formData.get('role') };
  const pw = String(formData.get('password') || '');
  if (pw) {
    if (pw.length < 6) redirect('/users?error=short');
    data.password = await bcrypt.hash(pw, 10);
  }
  if (formData.get('toggle')) {
    const u = await db.user.findUnique({ where: { id } });
    data.active = !u.active;
  }
  if (id === me.id) { delete data.role; delete data.active; } // can't lock yourself out
  await db.user.update({ where: { id }, data });
  revalidatePath('/users');
}

export default async function UsersPage({ searchParams }) {
  await requireAccess('users');
  const [users, emps] = await Promise.all([
    db.user.findMany({ include: { employee: true }, orderBy: { id: 'asc' } }),
    db.employee.findMany({ where: { active: true, user: null } }),
  ]);
  const err = { short: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', exists: 'اسم المستخدم موجود مسبقاً' }[searchParams?.error];

  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" />
      {err && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Table head={['المستخدم', 'الاسم', 'الموظف', 'تاريخ الإنشاء', 'الدور / كلمة مرور جديدة', '']}>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td dir="ltr" className="text-right font-mono">{u.username}</td>
                <td>{u.name}</td>
                <td>{u.employee?.name || '—'}</td>
                <td>{date(u.createdAt)}</td>
                <td colSpan={2}>
                  <form action={updateUser} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" className="input w-36 py-1" defaultValue={u.role}><Options map={ROLES} /></select>
                    <input name="password" type="password" className="input w-36 py-1" placeholder="كلمة مرور جديدة" />
                    <SubmitButton className="btn-secondary py-1">حفظ</SubmitButton>
                    <button name="toggle" value="1" className="text-xs link">{u.active ? 'تعطيل' : 'تفعيل'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
          <div className="card overflow-x-auto">
            <h2 className="mb-3">مصفوفة الصلاحيات</h2>
            <table className="table">
              <thead><tr><th>القسم</th>{Object.values(ROLES).map((r) => <th key={r}>{r}</th>)}</tr></thead>
              <tbody>
                {Object.entries(ACCESS).map(([sec, roles]) => (
                  <tr key={sec}><td>{SECTION_NAMES[sec]}</td>{Object.keys(ROLES).map((r) => <td key={r}>{roles.includes(r) ? '✅' : '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form action={createUser} className="card h-fit space-y-3">
          <h2>مستخدم جديد</h2>
          <Field label="اسم المستخدم (للدخول)"><input name="username" className="input" dir="ltr" required /></Field>
          <Field label="الاسم الظاهر"><input name="name" className="input" /></Field>
          <Field label="كلمة المرور"><input name="password" type="password" className="input" dir="ltr" required /></Field>
          <Field label="الدور"><select name="role" className="input" defaultValue="BROKER"><Options map={ROLES} /></select></Field>
          <Field label="ربط بموظف">
            <select name="employeeId" className="input"><option value="">— بدون —</option>{emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          </Field>
          <SubmitButton className="btn-primary w-full">إنشاء</SubmitButton>
        </form>
      </div>
    </>
  );
}
