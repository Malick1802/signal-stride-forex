
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

// Utility functions for URL validation
const isValidCacheableURL = (url) => {
  // Only cache HTTP/HTTPS requests from our origin
  return (url.protocol === 'http:' || url.protocol === 'https:') && 
         (url.origin === self.location.origin || !url.origin);
};

const isSafeRequest = (request) => {
  const url = new URL(request.url);
  
  // Block extension URLs and other unsafe schemes
  const unsafeSchemes = ['chrome-extension:', 'moz-extension:', 'safari-extension:', 'edge-extension:'];
  if (unsafeSchemes.some(scheme => url.protocol === scheme)) {
    console.warn('🚫 Blocked unsafe request:', url.href);
    return false;
  }
  
  return isValidCacheableURL(url);
};

// Enhanced fetch event with comprehensive error handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  try {
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
      return;
    }
    
    // Block unsafe requests early
    if (!isSafeRequest(request)) {
      event.respondWith(new Response('Request blocked', { status: 403 }));
      return;
    }
  } catch (error) {
    console.error('❌ URL parsing failed:', error);
    event.respondWith(new Response('Invalid request', { status: 400 }));
    return;
  }
  
  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response.ok) {
            return response;
          }
          
          // Clone the response for caching with error handling
          try {
            const responseClone = response.clone();
            
            // Cache successful responses with error handling
            caches.open(OFFLINE_CACHE_NAME)
              .then(cache => {
                if (isSafeRequest(request)) {
                  return cache.put(request, responseClone);
                }
              })
              .catch(cacheError => {
                console.warn('📱 Cache put failed:', cacheError);
              });
          } catch (cloneError) {
            console.warn('📱 Response clone failed:', cloneError);
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
            .catch(cacheError => {
              console.error('📱 Cache match failed:', cacheError);
              return new Response('Cache error', { status: 500 });
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
        
        // Not in cache, fetch from network with error handling
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response.ok) {
              return response;
            }
            
            // Clone and cache with comprehensive error handling
            try {
              const responseClone = response.clone();
              
              if (isSafeRequest(request)) {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    return cache.put(request, responseClone);
                  })
                  .catch(cacheError => {
                    console.warn('📱 Static asset cache failed:', cacheError);
                  });
              }
            } catch (cloneError) {
              console.warn('📱 Static asset clone failed:', cloneError);
            }
            
            return response;
          })
          .catch(fetchError => {
            console.warn('📱 Network fetch failed:', fetchError);
            
            // Network failed and not in cache
            if (request.destination === 'document') {
              // Return offline page for navigation requests
              return caches.match('/offline.html')
                .then(offlinePage => {
                  return offlinePage || new Response(
                    '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>App is offline</h1><p>Please check your connection</p></body></html>',
                    { headers: { 'Content-Type': 'text/html' } }
                  );
                });
            }
            
            return new Response('Offline', { status: 503 });
          });
      })
      .catch(cacheError => {
        console.error('📱 Cache match failed:', cacheError);
        return new Response('Cache error', { status: 500 });
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
