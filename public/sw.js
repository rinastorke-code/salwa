const CACHE = 'hr-shell-v2';
// Do NOT pre-cache '/' — it may be a redirect (to /login) which the Cache
// API refuses to store ("a redirected response was used for a request
// whose redirect mode is not 'follow'"), crashing SW install and breaking
// every subsequent navigation. Only cache static, redirect-free assets.
const SHELL = ['/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never intercept navigations (page loads) or non-GET/API/Supabase calls —
  // let the network/browser handle redirects (login, etc.) natively.
  if (e.request.mode === 'navigate') return;
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api') || url.hostname.includes('supabase')) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Never cache redirected or non-ok responses (same root cause as above)
        if (!res.ok || res.redirected) return res;
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('/manifest.json'));
    })
  );
});
