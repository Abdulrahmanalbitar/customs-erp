// Minimal service worker: makes the app installable and shows a friendly page when offline.
// Pages are never cached, so data is always live from the server.
const OFFLINE = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لا يوجد اتصال</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0a2a6b;color:#fff;text-align:center"><div><div style="font-size:48px">⚓</div><h2>لا يوجد اتصال بالإنترنت</h2><p>تحقق من الاتصال ثم أعد المحاولة.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:10px;border:0;font-size:16px">إعادة المحاولة</button></div></body></html>';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'content-type': 'text/html; charset=utf-8' } })));
});
