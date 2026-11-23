import { db } from './db';

export const DEFAULT_SETTINGS = {
  officeName: 'مكتب التخليص الجمركي',
  officePhone: '',
  officeAddress: '',
  licenseNo: '',
  exchangeRate: '14000', // SYP per USD
  defaultCurrency: 'USD',
  invoiceFooter: 'شكراً لتعاملكم معنا',
  customsOffices: 'أمانة جمارك اللاذقية\nأمانة جمارك طرطوس\nأمانة جمارك نصيب\nأمانة جمارك جديدة يابوس\nأمانة جمارك مطار دمشق الدولي\nأمانة جمارك باب الهوى\nأمانة جمارك المنطقة الحرة بدمشق',
};

export async function getSettings() {
  const rows = await db.setting.findMany();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  s.customsOfficeList = s.customsOffices.split('\n').map((x) => x.trim()).filter(Boolean);
  s.rate = parseFloat(s.exchangeRate) || 1;
  return s;
}
