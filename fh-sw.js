/* Farhoum : cache hors ligne (réseau d'abord, cache en secours) */
const V='fh-v1', HOSTS=['unpkg.com','cdn.jsdelivr.net'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','index.html']).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET'||r.headers.has('range'))return;
  const u=new URL(r.url); if(u.origin!==location.origin&&!HOSTS.includes(u.hostname))return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{});}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
