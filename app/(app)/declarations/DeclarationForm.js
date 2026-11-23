import { Field, Options } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { DECL_TYPES, TRANSPORT, CURRENCIES, DOC_KINDS, PRIORITY } from '@/lib/constants';
import AiAssist from './AiAssist';
import { saveDeclaration } from './actions';

export default function DeclarationForm({ decl = {}, clients, employees, offices, defaultClient, ai = false }) {
  const isNew = !decl.id;
  return (
    <form action={saveDeclaration} className="space-y-6">
      {decl.id && <input type="hidden" name="id" value={decl.id} />}
      <AiAssist enabled={ai} />
      <div className="card grid gap-4 md:grid-cols-3">
        <h2 className="md:col-span-3">المعلومات الأساسية</h2>
        <Field label="العميل *">
          <select name="clientId" className="input" required defaultValue={decl.clientId || defaultClient || ''}>
            <option value="">— اختر —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="نوع المعاملة">
          <select name="type" className="input" defaultValue={decl.type || 'IMPORT'}><Options map={DECL_TYPES} /></select>
        </Field>
        <Field label="رقم البيان الجمركي">
          <input name="declNo" className="input" defaultValue={decl.declNo || ''} />
        </Field>
        <Field label="الأمانة الجمركية">
          <input name="customsOffice" list="offices" className="input" defaultValue={decl.customsOffice || ''} />
          <datalist id="offices">{offices.map((o) => <option key={o} value={o} />)}</datalist>
        </Field>
        <Field label="المخلّص المسؤول">
          <select name="employeeId" className="input" defaultValue={decl.employeeId || ''}>
            <option value="">— بدون —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <Field label="وسيلة الشحن">
          <select name="transport" className="input" defaultValue={decl.transport || ''}><Options map={TRANSPORT} all="—" /></select>
        </Field>
        <Field label="الأولوية">
          <select name="priority" className="input" defaultValue={decl.priority || 'NORMAL'}><Options map={PRIORITY} /></select>
        </Field>
        <Field label="الموعد النهائي">
          <input name="dueDate" type="date" className="input" defaultValue={decl.dueDate ? new Date(decl.dueDate).toISOString().slice(0, 10) : ''} />
        </Field>
      </div>

      <div className="card grid gap-4 md:grid-cols-3">
        <h2 className="md:col-span-3">البضاعة والشحنة</h2>
        <Field label="وصف البضاعة" className="md:col-span-2"><input name="goods" className="input" defaultValue={decl.goods || ''} /></Field>
        <Field label="البند الجمركي (HS Code)"><input name="hsCode" className="input" dir="ltr" defaultValue={decl.hsCode || ''} /></Field>
        <Field label="بلد المنشأ"><input name="origin" className="input" defaultValue={decl.origin || ''} /></Field>
        <Field label="رقم الحاوية"><input name="containerNo" className="input" dir="ltr" defaultValue={decl.containerNo || ''} /></Field>
        <Field label="رقم البوليصة"><input name="billOfLading" className="input" dir="ltr" defaultValue={decl.billOfLading || ''} /></Field>
        <Field label="الوزن (كغ)"><input name="weight" type="number" step="any" className="input" defaultValue={decl.weight ?? ''} /></Field>
        <Field label="عدد الطرود"><input name="packages" type="number" className="input" defaultValue={decl.packages ?? ''} /></Field>
        <Field label="العملة">
          <select name="currency" className="input" defaultValue={decl.currency || 'USD'}><Options map={CURRENCIES} /></select>
        </Field>
        <Field label="قيمة البضاعة"><input name="goodsValue" type="number" step="any" className="input" defaultValue={decl.goodsValue ?? ''} /></Field>
        <Field label="الرسوم الجمركية المقدّرة"><input name="dutyAmount" type="number" step="any" className="input" defaultValue={decl.dutyAmount ?? ''} /></Field>
        <Field label="ملاحظات" className="md:col-span-3"><textarea name="notes" rows={2} className="input" defaultValue={decl.notes || ''} /></Field>
      </div>

      {isNew && (
        <div className="card">
          <h2 className="mb-3">المستندات المطلوبة</h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {DOC_KINDS.map((k, i) => (
              <label key={k} className="flex items-center gap-2 font-normal">
                <input type="checkbox" name="docs" value={k} defaultChecked={i < 4} /> {k}
              </label>
            ))}
          </div>
        </div>
      )}
      <SubmitButton>حفظ المعاملة</SubmitButton>
    </form>
  );
}
