
// Enhanced Service Worker for PWA functionality with inactivity fixes
const CACHE_NAME = 'forex-signals-v2';
const OFFLINE_CACHE_NAME = 'forex-signals-offline-v2';
const AUTH_CACHE_NAME = 'forex-auth-cache-v1';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico',
  '/manifest.json'
];

// API endpoints that should be cached with different strategies
const API_CACHE_PATTERNS = [
  /\/api\/signals/,
  /\/api\/market-data/,
  /\/functions\/v1\/check-subscription/,
  /\/functions\/v1\/fetch-market-data/
];

// Auth-related endpoints that should have special handling
const AUTH_ENDPOINTS = [
  /\/auth\/v1\/token/,
  /\/auth\/v1\/user/,
  /\/functions\/v1\/check-subscription/
];

// Cache versioning for invalidation
const CACHE_VERSION = Date.now();

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
        console.error('❌ Service Worker installation failed:', error);
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
                if (cacheName !== CACHE_NAME && 
                    cacheName !== OFFLINE_CACHE_NAME && 
                    cacheName !== AUTH_CACHE_NAME) {
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
  
  // Handle auth endpoints with special cache strategy
  if (AUTH_ENDPOINTS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // For auth endpoints, only cache successful responses briefly
          if (response.ok && response.status === 200) {
            const responseClone = response.clone();
            
            // Short-term cache for auth responses (5 minutes)
            caches.open(AUTH_CACHE_NAME)
              .then(cache => {
                const cacheRequest = new Request(request.url, {
                  method: request.method,
                  headers: request.headers
                });
                
                // Add timestamp to manage cache expiry
                const cacheResponse = new Response(responseClone.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: {
                    ...Object.fromEntries(response.headers.entries()),
                    'sw-cached-at': Date.now().toString(),
                    'sw-cache-version': CACHE_VERSION.toString()
                  }
                });
                
                cache.put(cacheRequest, cacheResponse);
              });
          }
          
          return response;
        })
        .catch(async () => {
          // For auth failures, try cache but check expiry
          const cachedResponse = await caches.match(request);
          
          if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            if (cachedAt) {
              const age = Date.now() - parseInt(cachedAt);
              // Only use cached auth if less than 5 minutes old
              if (age < 5 * 60 * 1000) {
                console.log('📱 Serving fresh auth cache:', request.url);
                return cachedResponse;
              }
            }
          }
          
          // Return auth error for expired/missing cache
          return new Response(
            JSON.stringify({ 
              error: 'Authentication Required', 
              message: 'Please check your connection and sign in again',
              code: 'AUTH_OFFLINE'
            }),
            {
              status: 401,
              statusText: 'Unauthorized',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle other API requests with enhanced network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request, {
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
        .then(response => {
          // Clone the response for caching
          const responseClone = response.clone();
          
          // Cache successful responses with version info
          if (response.ok) {
            caches.open(OFFLINE_CACHE_NAME)
              .then(cache => {
                const cacheResponse = new Response(responseClone.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: {
                    ...Object.fromEntries(response.headers.entries()),
                    'sw-cached-at': Date.now().toString(),
                    'sw-cache-version': CACHE_VERSION.toString()
                  }
                });
                cache.put(request, cacheResponse);
              })
              .catch(error => {
                console.error('❌ Cache write error:', error);
                // Report cache error back to main thread
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => {
                    client.postMessage({
                      type: 'CACHE_ERROR',
                      request: request.url,
                      error: error.message
                    });
                  });
                });
              });
          }
          
          return response;
        })
        .catch(async (error) => {
          console.log('📱 Network failed for:', request.url, error.message);
          
          // Network failed, try cache with staleness check
          const cachedResponse = await caches.match(request);
          
          if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            const cacheVersion = cachedResponse.headers.get('sw-cache-version');
            
            // Check if cache is reasonable fresh (30 minutes) or if we're offline
            if (cachedAt) {
              const age = Date.now() - parseInt(cachedAt);
              const isReasonablyFresh = age < 30 * 60 * 1000; // 30 minutes
              const isCurrentVersion = cacheVersion === CACHE_VERSION.toString();
              
              if (isReasonablyFresh && isCurrentVersion) {
                console.log('📱 Serving fresh cache:', request.url);
                return cachedResponse;
              } else if (!navigator.onLine) {
                console.log('📱 Serving stale cache (offline):', request.url);
                // Add header to indicate stale data
                return new Response(cachedResponse.body, {
                  status: cachedResponse.status,
                  statusText: cachedResponse.statusText,
                  headers: {
                    ...Object.fromEntries(cachedResponse.headers.entries()),
                    'sw-cache-stale': 'true'
                  }
                });
              }
            } else {
              // Legacy cache without timestamp
              console.log('📱 Serving legacy cache:', request.url);
              return cachedResponse;
            }
          }
          
          // Return appropriate offline response
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'No cached data available. Please check your connection.',
              timestamp: new Date().toISOString(),
              url: request.url
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
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
