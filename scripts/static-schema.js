// Parses prisma/schema.prisma into a small JSON description used by the in-browser database (static build).
const fs = require('fs');
const path = require('path');

function parse(src) {
  const models = {};
  for (const m of src.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const fields = {};
    for (const line of m[2].split('\n')) {
      const t = line.replace(/\/\/.*$/, '').trim();
      if (!t || t.startsWith('@@')) continue;
      const mm = t.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
      if (!mm) continue;
      const [, name, type, list, opt, rest] = mm;
      const f = { type, list: !!list, optional: !!opt };
      if (/@id\b/.test(rest)) f.id = true;
      if (/@unique\b/.test(rest)) f.unique = true;
      if (/@updatedAt\b/.test(rest)) f.updatedAt = true;
      const d = rest.match(/@default\(((?:[^()]|\([^()]*\))*)\)/);
      if (d) {
        const v = d[1].trim();
        if (v === 'autoincrement()') f.autoincrement = true;
        else if (v === 'now()') f.defaultNow = true;
        else if (/^".*"$/.test(v)) f.default = v.slice(1, -1);
        else if (v === 'true' || v === 'false') f.default = v === 'true';
        else if (!isNaN(Number(v))) f.default = Number(v);
      }
      const r = rest.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\](?:,\s*onDelete:\s*(\w+))?/);
      if (r) f.relation = { fk: r[1], ref: r[2], onDelete: r[3] || null };
      fields[name] = f;
    }
    models[m[1]] = { fields };
  }
  // Resolve relations: owning side has fk; back side looks up the owning side.
  for (const [mName, model] of Object.entries(models)) {
    for (const [fName, f] of Object.entries(model.fields)) {
      if (!models[f.type]) continue;
      if (f.relation) { f.kind = 'owner'; continue; }
      const other = Object.entries(models[f.type].fields).filter(([, of]) => of.type === mName && of.relation);
      if (other.length !== 1) throw new Error(`Ambiguous relation ${mName}.${fName}`);
      f.kind = 'back';
      f.fk = other[0][1].relation.fk;
      f.onDelete = other[0][1].relation.onDelete;
    }
  }
  return models;
}

const src = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const out = path.join(__dirname, '..', 'static', 'schema.json');
fs.writeFileSync(out, JSON.stringify(parse(src), null, 1));
console.log('[static] schema ->', path.relative(process.cwd(), out));
