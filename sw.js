const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `pitching-tracker-${CACHE_VERSION}`;

// Install event - skip waiting immediately to update fast
self.addEventListener('install', event => {
  console.log('Service Worker installing:', CACHE_VERSION);
  self.skipWaiting();
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  console.log('Service Worker activating:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('Taking control of all clients');
        return self.clients.claim();
      })
  );
});

// Message event - handle skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - always fetch fresh from network (no caching)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(error => {
        console.log('Fetch failed:', error);
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
        })
    );
  }
});
