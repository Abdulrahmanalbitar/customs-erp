import { Field } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { saveClient } from './actions';

export default function ClientForm({ client = {} }) {
  return (
    <form action={saveClient} className="card grid gap-4 md:grid-cols-2">
      {client.id && <input type="hidden" name="id" value={client.id} />}
      <Field label="اسم العميل / الشركة *">
        <input name="name" className="input" required defaultValue={client.name} />
      </Field>
      <Field label="النوع">
        <select name="type" className="input" defaultValue={client.type || 'COMPANY'}>
          <option value="COMPANY">شركة</option>
          <option value="PERSON">فرد</option>
        </select>
      </Field>
      <Field label="الهاتف"><input name="phone" className="input" dir="ltr" defaultValue={client.phone || ''} /></Field>
      <Field label="البريد الإلكتروني"><input name="email" className="input" dir="ltr" defaultValue={client.email || ''} /></Field>
      <Field label="رقم بطاقة المستورد"><input name="taxNumber" className="input" defaultValue={client.taxNumber || ''} /></Field>
      <Field label="السجل التجاري"><input name="commercialReg" className="input" defaultValue={client.commercialReg || ''} /></Field>
      <Field label="العنوان" className="md:col-span-2"><input name="address" className="input" defaultValue={client.address || ''} /></Field>
      <Field label="ملاحظات" className="md:col-span-2"><textarea name="notes" className="input" rows={3} defaultValue={client.notes || ''} /></Field>
      <div className="md:col-span-2"><SubmitButton>حفظ</SubmitButton></div>
    </form>
  );
}
