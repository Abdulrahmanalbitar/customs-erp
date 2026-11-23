// Picks the Prisma provider from DATABASE_URL so one schema works locally (SQLite) and online (PostgreSQL).
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env when it is not already in the environment (local runs).
if (!process.env.DATABASE_URL) {
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const m = env.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    if (m) process.env.DATABASE_URL = m[1].trim();
  } catch {}
}

const file = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const url = process.env.DATABASE_URL || '';
const provider = /^postgres(ql)?:\/\//.test(url) ? 'postgresql' : 'sqlite';
// Schema changes (db push) must bypass a connection pooler: use the direct URL when the host provides one.
const direct = ['DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING', 'DIRECT_URL'].find((k) => process.env[k]);
const src = fs.readFileSync(file, 'utf8');
let out = src.replace(/(datasource db \{\s*provider\s*=\s*)"[^"]+"/, `$1"${provider}"`);
out = out.replace(/\n\s*directUrl\s*=.*$/m, '');
if (provider === 'postgresql' && direct) out = out.replace(/(url\s*=\s*env\("DATABASE_URL"\))/, `$1\n  directUrl = env("${direct}")`);
if (out !== src) fs.writeFileSync(file, out);
console.log(`[db] provider = ${provider}${direct && provider === 'postgresql' ? `, direct = ${direct}` : ''}`);
