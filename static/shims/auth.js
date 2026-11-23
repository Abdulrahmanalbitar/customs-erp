// Browser version of lib/auth: the signed-in user id lives in this device's localStorage.
import { redirect } from './next-navigation';
import { db } from './db';
import { ACCESS } from '@/lib/constants';

const KEY = 'erp-session';
const MAX_AGE = 1000 * 60 * 60 * 12; // 12h

export function createSession(userId) {
  localStorage.setItem(KEY, JSON.stringify({ userId, exp: Date.now() + MAX_AGE }));
}
export function destroySession() { localStorage.removeItem(KEY); }

export async function getUser() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  if (!s || s.exp < Date.now()) return null;
  const user = await db.user.findUnique({ where: { id: Number(s.userId) } });
  return user && user.active ? user : null;
}
export function can(user, section) { return !!user && (ACCESS[section] || []).includes(user.role); }
export async function requireAccess(section) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (section && !can(user, section)) redirect('/?denied=1');
  return user;
}
