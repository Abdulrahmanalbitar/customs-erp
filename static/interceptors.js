// Glue that lets server-era code run in the browser:
// - fetch('/api/...') is answered by the app's own route handlers (app/api/**/route.js)
// - plain <a href="/x"> links and GET forms navigate inside the HashRouter
// - attachment links (/api/files/:id) open the file from the local database
import { bridge } from './shims/bridge';
import { db } from './shims/db';

const apiModules = import.meta.glob('../app/api/**/route.js', { eager: true });
const apiRoutes = Object.entries(apiModules).map(([file, mod]) => {
  const pattern = file.replace('../app', '').replace(/\/route\.js$/, '');
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/\[(\w+)\]/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  return { re, keys, mod };
});

async function handleApi(url, init) {
  for (const r of apiRoutes) {
    const m = url.pathname.match(r.re);
    if (!m) continue;
    const method = (init?.method || 'GET').toUpperCase();
    const handler = r.mod[method];
    if (!handler) return new Response('Method not allowed', { status: 405 });
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    return handler(new Request(url.href, init), { params });
  }
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
}

async function openFile(id) {
  const win = window.open('', '_blank');
  const doc = await db.document.findUnique({ where: { id: Number(id) }, include: { blob: true } });
  if (!doc?.blob) { win?.close(); alert('الملف غير موجود'); return; }
  const url = URL.createObjectURL(new Blob([doc.blob.data], { type: doc.mimeType || 'application/octet-stream' }));
  if (win) win.location.href = url;
  else window.location.href = url;
}

export function installInterceptors() {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const raw = typeof input === 'string' ? input : input.url;
    if (raw.startsWith('/api/')) return handleApi(new URL(raw, 'http://local.app'), init);
    return realFetch(input, init);
  };

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href?.startsWith('/')) return;
    e.preventDefault();
    const f = href.match(/^\/api\/files\/(\d+)/);
    if (f) openFile(f[1]);
    else bridge.navigate(href);
  }, true);

  document.addEventListener('submit', (e) => {
    const form = e.target;
    // Forms with a function action are handled by React (it renders action="javascript:...").
    if (e.defaultPrevented || /^javascript:/i.test(form.getAttribute('action') || '')) return;
    if ((form.getAttribute('method') || 'get').toLowerCase() !== 'get') return;
    e.preventDefault();
    const qs = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === 'string' && v !== '') qs.append(k, v);
    const action = form.getAttribute('action');
    const path = action && action.startsWith('/') ? action : window.location.hash.slice(1).split('?')[0] || '/';
    bridge.navigate(path + (qs.toString() ? `?${qs}` : ''));
  }); // bubble phase: React's own submit handlers (onSubmit / form actions) run first
}
