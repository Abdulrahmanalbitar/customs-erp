import { Field, Options } from '@/components/ui';
import { SubmitButton } from '@/components/buttons';
import { SHIP_MODES, PORTS } from '@/lib/constants';
import { saveShipment } from './actions';

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const CONTAINER_TYPES = ["20' DRY", "40' DRY", "40' HC", "20' REEFER", "40' REEFER", 'LCL', 'Open Top', 'Flat Rack'];
const CARRIERS = ['MSC', 'Maersk', 'CMA CGM', 'COSCO', 'Hapag-Lloyd', 'ONE', 'Evergreen', 'Yang Ming', 'ZIM', 'Arkas', 'Turkish Cargo', 'Emirates SkyCargo', 'Qatar Cargo'];

export default function ShipmentForm({ s = {}, clients, declarations, defaults = {} }) {
  return (
    <form action={saveShipment} className="space-y-6">
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <datalist id="ports">{Object.keys(PORTS).map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="carriers">{CARRIERS.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="card grid gap-4 md:grid-cols-3">
        <h2 className="md:col-span-3">الأساسيات</h2>
        <Field label="العميل *">
          <select name="clientId" className="input" required defaultValue={s.clientId || defaults.clientId || ''}>
            <option value="">— اختر —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="المعاملة الجمركية المرتبطة">
          <select name="declarationId" className="input" defaultValue={s.declarationId || defaults.declarationId || ''}>
            <option value="">— بدون —</option>
            {declarations.map((d) => <option key={d.id} value={d.id}>{d.refNo} – {d.client.name}</option>)}
          </select>
        </Field>
        <Field label="نوع الشحن">
          <select name="mode" className="input" defaultValue={s.mode || 'SEA'}><Options map={SHIP_MODES} /></select>
        </Field>
        <Field label="ميناء / مطار الشحن *"><input name="originPort" list="ports" className="input" required defaultValue={s.originPort || ''} placeholder="شنغهاي" /></Field>
        <Field label="ميناء / منفذ الوصول *"><input name="destPort" list="ports" className="input" required defaultValue={s.destPort || defaults.destPort || 'اللاذقية'} /></Field>
        <Field label="البضاعة"><input name="goods" className="input" defaultValue={s.goods || defaults.goods || ''} /></Field>
      </div>
      <div className="card grid gap-4 md:grid-cols-4">
        <h2 className="md:col-span-4">الناقل والحاوية</h2>
        <Field label="الخط الملاحي / الناقل"><input name="carrier" list="carriers" className="input" dir="ltr" defaultValue={s.carrier || ''} /></Field>
        <Field label="اسم السفينة / الرحلة"><input name="vessel" className="input" dir="ltr" defaultValue={s.vessel || ''} /></Field>
        <Field label="رقم الرحلة (Voyage)"><input name="voyage" className="input" dir="ltr" defaultValue={s.voyage || ''} /></Field>
        <Field label="رقم البوليصة B/L"><input name="blNo" className="input" dir="ltr" defaultValue={s.blNo || ''} /></Field>
        <Field label="رقم الحاوية"><input name="containerNo" className="input font-mono" dir="ltr" defaultValue={s.containerNo || defaults.containerNo || ''} /></Field>
        <Field label="نوع الحاوية">
          <select name="containerType" className="input" defaultValue={s.containerType || ''}>
            <option value="">—</option>
            {CONTAINER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="الوزن (كغ)"><input name="weight" type="number" step="any" className="input" defaultValue={s.weight ?? ''} /></Field>
        <div />
        <Field label="تاريخ المغادرة المتوقع ETD"><input name="etd" type="date" className="input" defaultValue={iso(s.etd)} /></Field>
        <Field label="تاريخ الوصول المتوقع ETA"><input name="eta" type="date" className="input" defaultValue={iso(s.eta)} /></Field>
        <Field label="ملاحظات" className="md:col-span-2"><input name="notes" className="input" defaultValue={s.notes || ''} /></Field>
      </div>
      <SubmitButton>حفظ الشحنة</SubmitButton>
    </form>
  );
}
