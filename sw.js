/* Service worker — خريطة قطاري */
var VER='qitari-carte-v2';
var SHELL=VER+'-shell', TILES=VER+'-tiles', LIB=VER+'-lib';
var SHELL_FILES=['./','./index.html','./offline.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
var LIB_FILES=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
var MAX_TILES=400;

self.addEventListener('install',function(e){
  e.waitUntil(Promise.all([
    caches.open(SHELL).then(function(c){return Promise.all(SHELL_FILES.map(function(u){return c.add(u).catch(function(){})}))}),
    caches.open(LIB).then(function(c){return Promise.all(LIB_FILES.map(function(u){return c.add(u).catch(function(){})}))})
  ]).then(function(){return self.skipWaiting()}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf(VER)!==0}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});

function trim(name,max){
  caches.open(name).then(function(c){c.keys().then(function(ks){
    if(ks.length>max) c.delete(ks[0]).then(function(){trim(name,max)});
  })});
}

self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET') return;
  var u=new URL(r.url);

  /* صفحة التطبيق: الشبكة أولاً ثم الكاش ثم صفحة offline */
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(function(res){
      if(res&&res.ok){var cp=res.clone();caches.open(SHELL).then(function(c){c.put('./index.html',cp)})}
      return res;
    }).catch(function(){
      return caches.match('./index.html').then(function(m){return m||caches.match('./offline.html')});
    }));
    return;
  }

  /* ملفات التطبيق نفسه */
  if(u.origin===self.location.origin){
    e.respondWith(fetch(r).then(function(res){
      if(res&&res.ok){var cp=res.clone();caches.open(SHELL).then(function(c){c.put(r,cp)})}
      return res;
    }).catch(function(){return caches.match(r)}));
    return;
  }

  /* Leaflet: الكاش أولاً */
  if(u.hostname==='unpkg.com'){
    e.respondWith(caches.match(r).then(function(m){
      return m||fetch(r).then(function(res){
        if(res&&res.ok){var cp=res.clone();caches.open(LIB).then(function(c){c.put(r,cp)})}
        return res;
      });
    }));
    return;
  }

  /* بلاطات الخريطة: كاش ثم تحديث في الخلفية */
  if(/tile|openstreetmap|arcgisonline|cartocdn|mapbox|opentopomap/i.test(u.hostname)||/\/\d+\/\d+\/\d+(\.\w+)?$/.test(u.pathname)){
    e.respondWith(caches.open(TILES).then(function(c){
      return c.match(r).then(function(m){
        var net=fetch(r).then(function(res){
          if(res&&(res.ok||res.type==='opaque')){c.put(r,res.clone());trim(TILES,MAX_TILES)}
          return res;
        }).catch(function(){return m});
        return m||net;
      });
    }));
    return;
  }
  /* باقي الطلبات (Supabase, SNCFT, ...): مباشرة من الشبكة، بدون كاش */
});

self.addEventListener('message',function(e){
  if(e.data==='skipWaiting') self.skipWaiting();
});
