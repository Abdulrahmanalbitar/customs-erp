import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { getSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { PageHeader, Table, Options, Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { money, num, str } from '@/lib/format';
import { CURRENCIES } from '@/lib/constants';
import { Settings } from 'lucide-react';

async function saveSettings(formData) {
  'use server';
  await requireAccess('settings');
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = String(formData.get(key) ?? '');
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  revalidatePath('/', 'layout');
}

async function saveHs(formData) {
  'use server';
  await requireAccess('settings');
  const id = Number(formData.get('id') || 0);
  if (formData.get('delete')) { await db.hsRate.delete({ where: { id } }); revalidatePath('/settings'); return; }
  const data = { hsCode: str(formData.get('hsCode')) || '0000', description: str(formData.get('description')) || '—', dutyRate: num(formData.get('dutyRate')), otherRate: num(formData.get('otherRate')) };
  if (id) await db.hsRate.update({ where: { id }, data });
  else await db.hsRate.upsert({ where: { hsCode: data.hsCode }, update: data, create: data });
  revalidatePath('/settings');
}

async function saveService(formData) {
  'use server';
  await requireAccess('settings');
  const id = Number(formData.get('id') || 0);
  const data = { name: str(formData.get('name')) || 'خدمة', price: num(formData.get('price')), currency: formData.get('currency') || 'USD' };
  if (id) {
    if (formData.get('toggle')) {
      const s = await db.service.findUnique({ where: { id } });
      await db.service.update({ where: { id }, data: { active: !s.active } });
    } else await db.service.update({ where: { id }, data });
  } else await db.service.create({ data });
  revalidatePath('/settings');
}

export default async function SettingsPage() {
  await requireAccess('settings');
  const [s, services, rates] = await Promise.all([getSettings(), db.service.findMany({ orderBy: { id: 'asc' } }), db.hsRate.findMany({ orderBy: { hsCode: 'asc' } })]);

  return (
    <>
      <PageHeader title="الإعدادات" icon={Settings} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={saveSettings} className="card grid h-fit gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2">بيانات المكتب</h2>
          <Field label="اسم المكتب" className="md:col-span-2"><input name="officeName" className="input" defaultValue={s.officeName} /></Field>
          <Field label="الهاتف"><input name="officePhone" className="input" dir="ltr" defaultValue={s.officePhone} /></Field>
          <Field label="رقم ترخيص التخليص"><input name="licenseNo" className="input" defaultValue={s.licenseNo} /></Field>
          <Field label="العنوان" className="md:col-span-2"><input name="officeAddress" className="input" defaultValue={s.officeAddress} /></Field>
          <Field label="سعر صرف الدولار (ل.س)"><input name="exchangeRate" type="number" step="any" className="input" defaultValue={s.exchangeRate} /></Field>
          <Field label="العملة الافتراضية لنقطة البيع"><select name="defaultCurrency" className="input" defaultValue={s.defaultCurrency}><Options map={CURRENCIES} /></select></Field>
          <Field label="تذييل الفاتورة" className="md:col-span-2"><input name="invoiceFooter" className="input" defaultValue={s.invoiceFooter} /></Field>
          <Field label="الأمانات الجمركية (كل سطر أمانة)" className="md:col-span-2"><textarea name="customsOffices" rows={6} className="input" defaultValue={s.customsOffices} /></Field>
          <div className="md:col-span-2"><SubmitButton>حفظ الإعدادات</SubmitButton></div>
        </form>

        <div className="space-y-4">
          <h2>الخدمات وأسعارها (تظهر في نقطة البيع)</h2>
          <Table head={['الخدمة', 'السعر', 'العملة', '']}>
            {services.map((sv) => (
              <tr key={sv.id} className={sv.active ? '' : 'opacity-50'}>
                <td colSpan={4}>
                  <form action={saveService} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={sv.id} />
                    <input name="name" className="input flex-1 py-1" defaultValue={sv.name} />
                    <input name="price" type="number" step="any" className="input w-28 py-1" defaultValue={sv.price} />
                    <select name="currency" className="input w-24 py-1" defaultValue={sv.currency}><Options map={CURRENCIES} /></select>
                    <SubmitButton className="btn-secondary py-1">حفظ</SubmitButton>
                    <button name="toggle" value="1" className="text-xs link">{sv.active ? 'إخفاء' : 'إظهار'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
          <form action={saveService} className="card flex flex-wrap items-end gap-2">
            <Field label="خدمة جديدة" className="flex-1"><input name="name" className="input" required /></Field>
            <Field label="السعر"><input name="price" type="number" step="any" className="input w-28" required /></Field>
            <Field label="العملة"><select name="currency" className="input w-24"><Options map={CURRENCIES} /></select></Field>
            <SubmitButton>إضافة</SubmitButton>
          </form>
          <p className="text-xs text-slate-500">سعر الصرف الحالي: 1$ = {money(s.rate, 'SYP')}. تُحوَّل أسعار الخدمات تلقائياً في نقطة البيع حسب العملة المختارة.</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-1">جدول البنود الجمركية (لحاسبة الرسوم)</h2>
        <p className="mb-3 text-xs text-slate-500">النسب المدخلة استرشادية. حدّثها حسب التعرفة الرسمية النافذة.</p>
        <div className="card space-y-2">
          {rates.map((r) => (
            <form key={r.id} action={saveHs} className="grid grid-cols-12 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="hsCode" className="input col-span-2 py-1.5 font-mono" dir="ltr" defaultValue={r.hsCode} />
              <input name="description" className="input col-span-5 py-1.5" defaultValue={r.description} />
              <input name="dutyRate" type="number" step="any" className="input col-span-2 py-1.5" defaultValue={r.dutyRate} title="رسم جمركي %" />
              <input name="otherRate" type="number" step="any" className="input col-span-1 py-1.5" defaultValue={r.otherRate} title="رسوم أخرى %" />
              <SubmitButton className="btn-secondary col-span-1 px-2 py-1.5">حفظ</SubmitButton>
              <button name="delete" value="1" className="col-span-1 text-xs text-red-600">حذف</button>
            </form>
          ))}
          <form action={saveHs} className="grid grid-cols-12 gap-2 border-t pt-3 dark:border-white/10">
            <input name="hsCode" className="input col-span-2 py-1.5 font-mono" dir="ltr" placeholder="0000.00" required />
            <input name="description" className="input col-span-5 py-1.5" placeholder="الوصف" required />
            <input name="dutyRate" type="number" step="any" className="input col-span-2 py-1.5" placeholder="رسم %" />
            <input name="otherRate" type="number" step="any" className="input col-span-1 py-1.5" placeholder="أخرى %" />
            <SubmitButton className="btn-primary col-span-2 py-1.5">إضافة بند</SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}