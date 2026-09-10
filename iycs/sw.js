/* Light Table Positive — offline shell.
 *
 * Registered from /iycs/, so its scope is /iycs/ only: this
 * worker never sees, caches, or intercepts anything else on the site.
 *
 * Strategy is stale-while-revalidate. A cached response is served
 * immediately (so the app opens with no network at all), while a fresh
 * copy is fetched in the background for the next launch. Bumping CACHE
 * forces every client onto a new generation.
 */

var CACHE = 'iycs-v1';

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  var url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;          // leave third parties alone
  if(url.pathname.indexOf('/iycs/') !== 0) return;   // and the rest of the site

  e.respondWith(
    caches.match(e.request).then(function(hit){
      var live = fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      });
      // When we already have a hit this runs unattended, so swallow the
      // offline rejection rather than leaving it unhandled.
      if(hit) live.catch(function(){});
      // Offline with nothing cached is the only case that can fail.
      return hit || live;
    }).catch(function(){
      return caches.match('./index.html');
    })
  );
});
