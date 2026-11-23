import { SHIP_STATUS, PORTS } from './constants';

/** 0..100 voyage progress, based on status and ETD→ETA timing */
export function shipProgress(s) {
  const step = SHIP_STATUS[s.status]?.step ?? 0;
  if (step >= 4) return 100;
  if (step <= 1) return step * 5;
  const start = new Date(s.atd || s.etd || s.createdAt).getTime();
  const end = new Date(s.eta || start + 14 * 864e5).getTime();
  const p = ((Date.now() - start) / Math.max(end - start, 1)) * 100;
  return Math.round(Math.max(10, Math.min(95, p)));
}

export function daysLeft(s) {
  if (!s.eta || s.ata) return null;
  return Math.ceil((new Date(s.eta).getTime() - Date.now()) / 864e5);
}

export function portCoord(name) {
  if (!name) return null;
  const key = Object.keys(PORTS).find((k) => name.includes(k) || k.includes(name));
  return key ? PORTS[key] : null;
}

export async function nextTracking(db) {
  const year = String(new Date().getFullYear()).slice(2);
  for (;;) {
    const code = `TRK${year}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (!(await db.shipment.findUnique({ where: { trackingNo: code } }))) return code;
  }
}
