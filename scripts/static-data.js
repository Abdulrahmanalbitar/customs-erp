// Seeds a throwaway SQLite database and dumps every table to static/demo-data.json for the static build.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dbFile = path.join(root, 'prisma', 'static-demo.db');
for (const f of [dbFile, dbFile + '-journal']) fs.rmSync(f, { force: true });
const env = { ...process.env, DATABASE_URL: 'file:./static-demo.db' };
execSync('node scripts/db-provider.js && npx prisma db push --skip-generate && node prisma/seed.js', { cwd: root, env, stdio: 'inherit' });

process.env.DATABASE_URL = env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'static', 'schema.json'), 'utf8'));

(async () => {
  const db = new PrismaClient();
  const tables = {};
  for (const name of Object.keys(schema)) {
    const key = name[0].toLowerCase() + name.slice(1);
    tables[name] = await db[key].findMany();
  }
  await db.$disconnect();
  fs.writeFileSync(path.join(root, 'static', 'demo-data.json'), JSON.stringify({ dumpedAt: new Date().toISOString(), tables }));
  for (const f of [dbFile, dbFile + '-journal']) fs.rmSync(f, { force: true });
  console.log('[static] demo data ->', Object.entries(tables).map(([k, v]) => `${k}:${v.length}`).join(' '));
})();
