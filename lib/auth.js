import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { ACCESS } from './constants';

const COOKIE = 'session';
// Without SESSION_SECRET, derive one from the database URL (never committed) rather than a known default.
const SECRET = process.env.SESSION_SECRET
  || (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:') ? crypto.createHash('sha256').update('erp:' + process.env.DATABASE_URL).digest('hex') : 'dev-secret');
const MAX_AGE = 60 * 60 * 12; // 12h

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function createSession(userId) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIE !== '1',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

export async function getUser() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split('.');
  if (!id || !exp || !sig) return null;
  const expected = sign(`${id}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const user = await db.user.findUnique({ where: { id: Number(id) } });
  if (!user || !user.active) return null;
  return user;
}

export function can(user, section) {
  return !!user && (ACCESS[section] || []).includes(user.role);
}

/** Use in pages and server actions. Redirects if not allowed. */
export async function requireAccess(section) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (section && !can(user, section)) redirect('/?denied=1');
  return user;
}
