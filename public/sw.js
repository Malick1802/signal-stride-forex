
// Service Worker for PWA functionality
const CACHE_NAME = 'forex-signals-v1';
const OFFLINE_CACHE_NAME = 'forex-signals-offline-v1';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico',
  '/manifest.json'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/signals/,
  /\/api\/market-data/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📱 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('📱 Service Worker installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker installation failed (storage error):', error);
        // Continue anyway - we can work without cache
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('📱 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE_NAME) {
              console.log('📱 Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('📱 Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response for caching
          const responseClone = response.clone();
          
          // Cache successful responses (with error handling)
          if (response.ok) {
            caches.open(OFFLINE_CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              })
              .catch(error => {
                console.warn('⚠️ Failed to cache API response:', error);
              });
          }
          
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('📱 Serving from cache:', request.url);
                return cachedResponse;
              }
              
              // Return offline fallback
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'No cached data available' 
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            })
            .catch(error => {
              console.warn('⚠️ Cache lookup failed:', error);
              return new Response(
                JSON.stringify({ 
                  error: 'Storage Error', 
                  message: 'Unable to access cached data' 
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }
  
  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response.ok) {
              return response;
            }
            
            // Clone the response for caching
            const responseClone = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            // Network failed and not in cache
            if (request.destination === 'document') {
              // Return offline page for navigation requests
              return caches.match('/offline.html');
            }
            
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  console.log('📱 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-signals') {
    event.waitUntil(
      fetch('/api/signals')
        .then(response => response.json())
        .then(data => {
          console.log('📱 Background sync completed:', data);
          
          // Update cached data
          return caches.open(OFFLINE_CACHE_NAME)
            .then(cache => {
              cache.put('/api/signals', new Response(JSON.stringify(data)));
            });
        })
        .catch(error => {
          console.error('❌ Background sync failed:', error);
        })
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New forex signal available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View Signals'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ForexAlert Pro', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});
