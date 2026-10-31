// Service worker: deixa o aplicativo abrir sem internet.
// Páginas de dados (Supabase) nunca passam por aqui; só o "casco" do app e arquivos estáticos.
const V = 'os-v2';
const STATIC = `${V}-static`;
const PAGES = `${V}-pages`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add('/')).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// A página pede para guardar os arquivos que ela já carregou (antes do worker assumir o controle).
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'cache' && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(STATIC).then((c) => Promise.all(e.data.urls.map((u) => c.add(u).catch(() => {})))));
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    if (url.pathname !== '/') return; // só o app principal; laudos e QR precisam de internet
    e.respondWith(
      new Promise((resolve) => {
        let done = false;
        const fallback = () => caches.match('/').then((hit) => hit && !done && ((done = true), resolve(hit)));
        const timer = setTimeout(fallback, 4000); // rede muito lenta: usa a cópia guardada
        fetch(req)
          .then((res) => {
            clearTimeout(timer);
            if (res.ok) caches.open(PAGES).then((c) => c.put('/', res.clone()));
            if (!done) { done = true; resolve(res); }
          })
          .catch(() => { clearTimeout(timer); fallback().then(() => { if (!done) resolve(Response.error()); }); });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
  }
});

// Notificações (preventivas, agenda do dia, teste)
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(d.title || 'ClimaOS', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || undefined,
      data: { url: d.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const win = list.find((c) => new URL(c.url).origin === location.origin);
      if (win) return win.navigate(url).then((c) => (c || win).focus());
      return self.clients.openWindow(url);
    })
  );
});
