// In-browser database for the static (GitHub Pages) build.
// Implements the subset of the Prisma Client API this app uses, over plain arrays kept in memory
// and persisted to IndexedDB on this device. Relations come from static/schema.json (generated
// from prisma/schema.prisma), so pages and actions run unchanged.
import schema from '../schema.json';

const IDB_NAME = 'customs-erp';
const IDB_STORE = 'state';
const KEY = 'db-v1';

let state = null; // { tables: { Model: rows[] }, seq: { Model: lastId } }

// ---------- persistence ----------
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet() {
  const d = await idb();
  return new Promise((res, rej) => {
    const q = d.transaction(IDB_STORE).objectStore(IDB_STORE).get(KEY);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
async function idbPut(v) {
  const d = await idb();
  return new Promise((res, rej) => {
    const tx = d.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(v, KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

let saveTimer = null;
let changeTimer = null;
function touched() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => idbPut(state).catch((e) => console.error('[db] save failed', e)), 250);
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => window.dispatchEvent(new Event('db:changed')), 0);
}

const dateFields = (model) => Object.entries(schema[model].fields).filter(([, f]) => f.type === 'DateTime').map(([k]) => k);

function fromDump(dump) {
  // Shift demo dates so the sample office always looks "current".
  const shift = Date.now() - new Date(dump.dumpedAt).getTime();
  const tables = {};
  const seq = {};
  for (const model of Object.keys(schema)) {
    const df = dateFields(model);
    tables[model] = (dump.tables[model] || []).map((r) => {
      const row = { ...r };
      for (const k of df) if (row[k]) row[k] = new Date(new Date(row[k]).getTime() + (dump.shift === false ? 0 : shift));
      return row;
    });
    seq[model] = tables[model].reduce((m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m), 0);
  }
  return { tables, seq };
}

/** Load the database: this device's saved copy, or the demo data the first time. */
export async function initDb() {
  if (state) return;
  let saved = null;
  try { saved = await idbGet(); } catch (e) { console.warn('[db] IndexedDB unavailable, data will not persist', e); }
  if (saved?.tables) {
    state = saved;
    for (const m of Object.keys(schema)) { state.tables[m] ||= []; state.seq[m] ||= 0; }
  } else {
    const demo = (await import('../demo-data.json')).default;
    state = fromDump(demo);
    try { await idbPut(state); } catch {}
  }
}

/** Backup helpers (settings page). */
export function exportDb() {
  const tables = {};
  for (const [m, rows] of Object.entries(state.tables)) {
    tables[m] = rows.map((r) => {
      const o = { ...r };
      for (const [k, v] of Object.entries(o)) if (v instanceof Uint8Array) o[k] = { $bytes: btoa(String.fromCharCode(...v)) };
      return o;
    });
  }
  return { app: 'customs-erp', version: 1, dumpedAt: new Date().toISOString(), shift: false, tables };
}
export async function importDb(dump) {
  if (dump?.app !== 'customs-erp' || !dump.tables) throw new Error('ملف النسخة الاحتياطية غير صالح');
  for (const rows of Object.values(dump.tables)) {
    for (const r of rows) for (const [k, v] of Object.entries(r)) if (v && v.$bytes) r[k] = Uint8Array.from(atob(v.$bytes), (c) => c.charCodeAt(0));
  }
  state = fromDump({ ...dump, shift: false });
  await idbPut(state);
  touched();
}
export async function resetDb() {
  const demo = (await import('../demo-data.json')).default;
  state = fromDump(demo);
  await idbPut(state);
  touched();
}

// ---------- helpers ----------
class PrismaError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const F = (model) => schema[model].fields;
const isRel = (model, k) => !!schema[F(model)[k]?.type];
const idKey = (model) => Object.entries(F(model)).find(([, f]) => f.id)?.[0] || 'id';
const rows = (model) => state.tables[model];
const cmpVal = (v) => (v instanceof Date ? v.getTime() : v);

function toDate(model, k, v) {
  if (v == null) return v;
  return F(model)[k]?.type === 'DateTime' && !(v instanceof Date) ? new Date(v) : v;
}

function related(model, row, k) {
  const f = F(model)[k];
  const other = f.type;
  if (f.kind === 'owner') {
    const v = row[f.relation.fk];
    return v == null ? null : rows(other).find((r) => r[f.relation.ref] === v) || null;
  }
  const id = row[idKey(model)];
  const list = rows(other).filter((r) => r[f.fk] === id);
  return f.list ? list : list[0] || null;
}

function matchScalar(model, k, v, cond) {
  if (cond === undefined) return true;
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) return cmpVal(v ?? null) === cmpVal(toDate(model, k, cond));
  const ci = cond.mode === 'insensitive';
  const s = (x) => (ci ? String(x ?? '').toLowerCase() : String(x ?? ''));
  for (const [op, raw] of Object.entries(cond)) {
    const c = toDate(model, k, raw);
    const a = cmpVal(v);
    const b = cmpVal(c);
    switch (op) {
      case 'equals': if (a !== b) return false; break;
      case 'in': if (!c.map(cmpVal).includes(a)) return false; break;
      case 'notIn': if (c.map(cmpVal).includes(a)) return false; break;
      case 'lt': if (!(v != null && a < b)) return false; break;
      case 'lte': if (!(v != null && a <= b)) return false; break;
      case 'gt': if (!(v != null && a > b)) return false; break;
      case 'gte': if (!(v != null && a >= b)) return false; break;
      case 'contains': if (v == null || !s(v).includes(s(c))) return false; break;
      case 'startsWith': if (v == null || !s(v).startsWith(s(c))) return false; break;
      case 'endsWith': if (v == null || !s(v).endsWith(s(c))) return false; break;
      case 'not':
        if (c !== null && typeof c === 'object' && !(c instanceof Date)) { if (matchScalar(model, k, v, c)) return false; }
        else if (cmpVal(v ?? null) === b) return false;
        break;
      case 'mode': break;
      default: throw new Error(`[db] unsupported filter ${op}`);
    }
  }
  return true;
}

function match(model, row, where) {
  if (!where) return true;
  for (const [k, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (k === 'AND') { if (![].concat(cond).every((w) => match(model, row, w))) return false; continue; }
    if (k === 'OR') { if (!cond.some((w) => match(model, row, w))) return false; continue; }
    if (k === 'NOT') { if ([].concat(cond).some((w) => match(model, row, w))) return false; continue; }
    if (isRel(model, k)) {
      const f = F(model)[k];
      const rel = related(model, row, k);
      if (f.list) {
        if (cond.some && !rel.some((r) => match(f.type, r, cond.some))) return false;
        if (cond.none && rel.some((r) => match(f.type, r, cond.none))) return false;
        if (cond.every && !rel.every((r) => match(f.type, r, cond.every))) return false;
      } else {
        if (cond === null) { if (rel) return false; continue; }
        if ('is' in cond || 'isNot' in cond) {
          if ('is' in cond && (cond.is === null ? rel : !rel || !match(f.type, rel, cond.is))) return false;
          if ('isNot' in cond && (cond.isNot === null ? !rel : rel && match(f.type, rel, cond.isNot))) return false;
        } else if (!rel || !match(f.type, rel, cond)) return false;
      }
      continue;
    }
    if (!matchScalar(model, k, row[k], cond)) return false;
  }
  return true;
}

function sortRows(list, orderBy) {
  if (!orderBy) return list;
  const keys = [].concat(orderBy).flatMap((o) => Object.entries(o));
  return [...list].sort((x, y) => {
    for (const [k, dir] of keys) {
      const d = typeof dir === 'object' ? dir.sort : dir;
      const a = cmpVal(x[k]);
      const b = cmpVal(y[k]);
      if (a === b) continue;
      if (a == null) return 1;
      if (b == null) return -1;
      const r = typeof a === 'string' ? a.localeCompare(b, 'ar') : a < b ? -1 : 1;
      return d === 'desc' ? -r : r;
    }
    return 0;
  });
}

function page(list, { skip, take } = {}) {
  let out = list;
  if (skip) out = out.slice(skip);
  if (take != null) out = take < 0 ? out.slice(take) : out.slice(0, take);
  return out;
}

function scalars(model, row) {
  const o = {};
  for (const k of Object.keys(F(model))) if (!isRel(model, k)) o[k] = row[k] ?? null;
  return o;
}

function relArgs(model, row, k, args) {
  const f = F(model)[k];
  let rel = related(model, row, k);
  const a = args === true ? {} : args;
  if (f.list) {
    rel = page(sortRows(rel.filter((r) => match(f.type, r, a.where)), a.orderBy), a);
    return rel.map((r) => project(f.type, r, a));
  }
  return rel ? project(f.type, rel, a) : null;
}

function countRel(model, row, spec) {
  const out = {};
  const sel = spec === true ? Object.fromEntries(Object.keys(F(model)).filter((k) => F(model)[k].list).map((k) => [k, true])) : spec.select;
  for (const [k, v] of Object.entries(sel)) {
    if (!v) continue;
    const list = related(model, row, k);
    out[k] = v === true ? list.length : list.filter((r) => match(F(model)[k].type, r, v.where)).length;
  }
  return out;
}

function project(model, row, args = {}) {
  const { select, include } = args;
  if (select) {
    const o = {};
    for (const [k, v] of Object.entries(select)) {
      if (!v) continue;
      if (k === '_count') o._count = countRel(model, row, v);
      else if (isRel(model, k)) o[k] = relArgs(model, row, k, v);
      else o[k] = row[k] ?? null;
    }
    return o;
  }
  const o = scalars(model, row);
  if (include) {
    for (const [k, v] of Object.entries(include)) {
      if (!v) continue;
      if (k === '_count') o._count = countRel(model, row, v);
      else o[k] = relArgs(model, row, k, v);
    }
  }
  return o;
}

function checkUnique(model, row, selfId) {
  const idk = idKey(model);
  for (const [k, f] of Object.entries(F(model))) {
    if (!(f.unique || f.id) || row[k] == null) continue;
    if (rows(model).some((r) => r !== selfId && r[k] === row[k])) throw new PrismaError('P2002', `Unique constraint failed on ${model}.${k}`);
  }
  return idk;
}

function applyScalar(model, row, k, v) {
  if (v !== null && typeof v === 'object' && !(v instanceof Date) && !(v instanceof Uint8Array) && !Array.isArray(v)) {
    if ('set' in v) row[k] = toDate(model, k, v.set);
    if ('increment' in v) row[k] = (row[k] || 0) + v.increment;
    if ('decrement' in v) row[k] = (row[k] || 0) - v.decrement;
    if ('multiply' in v) row[k] = (row[k] || 0) * v.multiply;
    if ('divide' in v) row[k] = (row[k] || 0) / v.divide;
    return;
  }
  row[k] = toDate(model, k, v);
}

function create(model, data) {
  const row = {};
  const later = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (isRel(model, k)) {
      const f = F(model)[k];
      if (f.kind === 'owner') {
        if (v.connect) row[f.relation.fk] = v.connect[f.relation.ref];
        else if (v.create) row[f.relation.fk] = create(f.type, v.create)[f.relation.ref];
      } else later.push([k, v]);
    } else applyScalar(model, row, k, v);
  }
  for (const [k, f] of Object.entries(F(model))) {
    if (isRel(model, k) || row[k] !== undefined) continue;
    if (f.autoincrement) row[k] = ++state.seq[model];
    else if (f.defaultNow || f.updatedAt) row[k] = new Date();
    else if ('default' in f) row[k] = f.default;
    else row[k] = null;
  }
  if (typeof row.id === 'number' && row.id > state.seq[model]) state.seq[model] = row.id;
  checkUnique(model, row);
  rows(model).push(row);
  for (const [k, v] of later) nestedBack(model, row, k, v);
  return row;
}

function nestedBack(model, row, k, v) {
  const f = F(model)[k];
  const id = row[idKey(model)];
  const children = () => rows(f.type).filter((r) => r[f.fk] === id);
  if (v.create) for (const c of [].concat(v.create)) create(f.type, { ...c, [f.fk]: id });
  if (v.createMany) for (const c of v.createMany.data) create(f.type, { ...c, [f.fk]: id });
  if (v.deleteMany) for (const c of children().filter((r) => match(f.type, r, v.deleteMany === true ? {} : v.deleteMany))) remove(f.type, c);
  if (v.updateMany) for (const c of children().filter((r) => match(f.type, r, v.updateMany.where))) update(f.type, c, v.updateMany.data);
  if (v.upsert) {
    const ex = f.list ? children().find((r) => match(f.type, r, v.upsert.where)) : children()[0];
    if (ex) update(f.type, ex, v.upsert.update);
    else create(f.type, { ...v.upsert.create, [f.fk]: id });
  }
  if (v.update && !f.list) { const ex = children()[0]; if (ex) update(f.type, ex, v.update); }
  if (v.delete && !f.list) { const ex = children()[0]; if (ex) remove(f.type, ex); }
  if (v.connect) for (const c of [].concat(v.connect)) { const r = rows(f.type).find((x) => match(f.type, x, c)); if (r) r[f.fk] = id; }
}

function update(model, row, data) {
  const next = { ...row };
  const later = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (isRel(model, k)) {
      const f = F(model)[k];
      if (f.kind === 'owner') {
        if (v.connect) next[f.relation.fk] = v.connect[f.relation.ref];
        if (v.disconnect) next[f.relation.fk] = null;
        if (v.create) next[f.relation.fk] = create(f.type, v.create)[f.relation.ref];
      } else later.push([k, v]);
    } else applyScalar(model, next, k, v);
  }
  for (const [k, f] of Object.entries(F(model))) if (f.updatedAt && data[k] === undefined) next[k] = new Date();
  checkUnique(model, next, row);
  Object.assign(row, next);
  for (const [k, v] of later) nestedBack(model, row, k, v);
  return row;
}

function remove(model, row) {
  const id = row[idKey(model)];
  for (const [k, f] of Object.entries(F(model))) {
    if (f.kind !== 'back') continue;
    for (const c of rows(f.type).filter((r) => r[f.fk] === id)) {
      if (f.onDelete === 'Cascade') remove(f.type, c);
      else if (f.onDelete === 'SetNull' || F(f.type)[f.fk].optional) c[f.fk] = null;
      else throw new PrismaError('P2003', `Foreign key constraint failed on ${f.type}.${f.fk}`);
    }
  }
  const i = rows(model).indexOf(row);
  if (i >= 0) rows(model).splice(i, 1);
  return row;
}

function find(model, where) {
  const r = rows(model).find((x) => match(model, x, where));
  return r || null;
}

function aggregateRows(model, list, args) {
  const out = {};
  for (const op of ['_sum', '_avg', '_min', '_max']) {
    if (!args[op]) continue;
    out[op] = {};
    for (const [k, on] of Object.entries(args[op])) {
      if (!on) continue;
      const vals = list.map((r) => r[k]).filter((v) => v != null);
      if (op === '_sum') out[op][k] = vals.length ? vals.reduce((s, v) => s + v, 0) : null;
      if (op === '_avg') out[op][k] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      if (op === '_min') out[op][k] = vals.length ? vals.reduce((m, v) => (cmpVal(v) < cmpVal(m) ? v : m)) : null;
      if (op === '_max') out[op][k] = vals.length ? vals.reduce((m, v) => (cmpVal(v) > cmpVal(m) ? v : m)) : null;
    }
  }
  if (args._count) {
    if (args._count === true) out._count = list.length;
    else {
      out._count = {};
      for (const [k, on] of Object.entries(args._count)) if (on) out._count[k] = k === '_all' ? list.length : list.filter((r) => r[k] != null).length;
    }
  }
  return out;
}

// ---------- model delegate ----------
function delegate(model) {
  const write = (fn) => (...a) => { const r = fn(...a); touched(); return Promise.resolve(r); };
  return {
    findMany: async (a = {}) => {
      let list = rows(model).filter((r) => match(model, r, a.where));
      list = page(sortRows(list, a.orderBy), a);
      if (a.distinct) {
        const seen = new Set();
        list = list.filter((r) => { const key = [].concat(a.distinct).map((k) => cmpVal(r[k])).join('|'); if (seen.has(key)) return false; seen.add(key); return true; });
      }
      return list.map((r) => project(model, r, a));
    },
    findUnique: async (a) => { const r = find(model, a.where); return r ? project(model, r, a) : null; },
    findUniqueOrThrow: async (a) => { const r = find(model, a.where); if (!r) throw new PrismaError('P2025', 'Record not found'); return project(model, r, a); },
    findFirst: async (a = {}) => {
      const r = sortRows(rows(model).filter((x) => match(model, x, a.where)), a.orderBy)[a.skip || 0];
      return r ? project(model, r, a) : null;
    },
    count: async (a = {}) => rows(model).filter((r) => match(model, r, a.where)).length,
    aggregate: async (a = {}) => aggregateRows(model, rows(model).filter((r) => match(model, r, a.where)), a),
    groupBy: async (a) => {
      const by = [].concat(a.by);
      const groups = new Map();
      for (const r of rows(model).filter((x) => match(model, x, a.where))) {
        const key = JSON.stringify(by.map((k) => cmpVal(r[k])));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      }
      let out = [...groups.values()].map((list) => ({ ...Object.fromEntries(by.map((k) => [k, list[0][k] ?? null])), ...aggregateRows(model, list, a) }));
      if (a.orderBy) {
        const keys = [].concat(a.orderBy).flatMap((o) => Object.entries(o));
        out.sort((x, y) => {
          for (const [k, dir] of keys) {
            let av = x[k];
            let bv = y[k];
            if (typeof dir === 'object') { const [[f, d]] = Object.entries(dir); av = x[k]?.[f]; bv = y[k]?.[f]; if (av !== bv) return (av < bv ? -1 : 1) * (d === 'desc' ? -1 : 1); continue; }
            if (av !== bv) return (cmpVal(av) < cmpVal(bv) ? -1 : 1) * (dir === 'desc' ? -1 : 1);
          }
          return 0;
        });
      }
      return page(out, a);
    },
    create: write((a) => project(model, create(model, a.data), a)),
    createMany: write((a) => { for (const d of a.data) create(model, d); return { count: a.data.length }; }),
    update: write((a) => {
      const r = find(model, a.where);
      if (!r) throw new PrismaError('P2025', `${model} record to update not found`);
      return project(model, update(model, r, a.data), a);
    }),
    updateMany: write((a) => { const list = rows(model).filter((r) => match(model, r, a.where)); for (const r of list) update(model, r, a.data); return { count: list.length }; }),
    upsert: write((a) => {
      const r = find(model, a.where);
      return project(model, r ? update(model, r, a.update) : create(model, a.create), a);
    }),
    delete: write((a) => {
      const r = find(model, a.where);
      if (!r) throw new PrismaError('P2025', `${model} record to delete not found`);
      const snap = project(model, r, a);
      remove(model, r);
      return snap;
    }),
    deleteMany: write((a = {}) => { const list = rows(model).filter((r) => match(model, r, a.where)); for (const r of list) remove(model, r); return { count: list.length }; }),
  };
}

const delegates = {};
const modelName = (k) => k[0].toUpperCase() + k.slice(1);

export const db = new Proxy({}, {
  get(_, k) {
    if (k === '$transaction') {
      return async (arg) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        const snap = structuredClone(state);
        try { return await arg(db); } catch (e) { state = snap; touched(); throw e; }
      };
    }
    if (k === '$disconnect' || k === '$connect') return async () => {};
    if (typeof k !== 'string') return undefined;
    const m = modelName(k);
    if (!schema[m]) return undefined;
    return (delegates[m] ||= delegate(m));
  },
});

export default db;
