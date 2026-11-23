export function money(n, cur = 'USD') {
  const v = Number(n || 0);
  const d = cur === 'SYP' ? 0 : 2;
  const s = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return cur === 'SYP' ? `${s} ل.س` : `$${s}`;
}
export function date(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}
export function dateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { hour12: false }).slice(0, 17);
}
export function num(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}
export function str(v) {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}
export function int(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}
