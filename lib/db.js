import { PrismaClient } from '@prisma/client';

// Pooled PostgreSQL URLs (Neon "-pooler", Supabase :6543) need pgbouncer=true for Prisma.
function url() {
  const u = process.env.DATABASE_URL || '';
  if (/^postgres/.test(u) && /-pooler\.|:6543\//.test(u) && !/pgbouncer=/.test(u)) return u + (u.includes('?') ? '&' : '?') + 'pgbouncer=true';
  return undefined;
}

const g = globalThis;
const pooled = url();
export const db = g.__prisma || new PrismaClient(pooled ? { datasources: { db: { url: pooled } } } : undefined);
if (process.env.NODE_ENV !== 'production') g.__prisma = db;
