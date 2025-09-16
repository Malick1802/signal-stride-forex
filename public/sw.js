
// Service Worker for PWA functionality
const CACHE_NAME = 'forex-signals-v3';
const OFFLINE_CACHE_NAME = 'forex-signals-offline-v3';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/favicon.ico',
  '/manifest.json'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/signals/,
  /\/api\/market-data/
];

// Helper function to check if a request URL is cacheable
function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    // Only cache HTTP and HTTPS requests
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.log('📱 Skipping non-HTTP(S) request:', url.protocol, url.href);
      return false;
    }
    // Skip chrome-extension and other browser-specific schemes
    if (url.protocol.startsWith('chrome-extension:') || 
        url.protocol.startsWith('moz-extension:') ||
        url.protocol.startsWith('webkit:') ||
        url.protocol.startsWith('data:') ||
        url.protocol.startsWith('blob:')) {
      console.log('📱 Skipping browser extension/special request:', url.href);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('⚠️ Invalid URL for caching:', request.url, error);
    return false;
  }
}

// Safe cache put operation with error handling
async function safeCachePut(cacheName, request, response) {
  if (!isCacheableRequest(request)) {
    return false;
  }
  
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    console.log('📱 Cached successfully:', request.url);
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to cache request:', request.url, error.message);
    return false;
  }
}

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
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip non-cacheable requests early (chrome-extension://, etc.)
  if (!isCacheableRequest(request)) {
    return; // Let the browser handle it normally
  }
  
  const url = new URL(request.url);
  
  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request)
        .then(async response => {
          // Clone the response for caching
          const responseClone = response.clone();
          
          // Cache successful responses using safe caching
          if (response.ok) {
            await safeCachePut(OFFLINE_CACHE_NAME, request, responseClone);
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
  
  // Handle navigation and Vite chunks with network-first strategy
  if (request.destination === 'document' || url.pathname.includes('assets/') || url.pathname.includes('.js') || url.pathname.includes('.css')) {
    event.respondWith(
      fetch(request)
        .then(async response => {
          if (response.ok) {
            const responseClone = response.clone();
            await safeCachePut(CACHE_NAME, request, responseClone);
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
              
              // Return basic offline response for documents
              if (request.destination === 'document') {
                return new Response('App offline - please check your connection', { 
                  status: 503,
                  headers: { 'Content-Type': 'text/html' }
                });
              }
              
              return new Response('Offline', { status: 503 });
            });
        })
    );
    return;
  }
  
  // Handle other static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then(async response => {
            // Don't cache non-successful responses
            if (!response.ok) {
              return response;
            }
            
            // Clone the response for caching
            const responseClone = response.clone();
            
            // Use safe caching method
            await safeCachePut(CACHE_NAME, request, responseClone);
            
            return response;
          })
          .catch(() => {
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
  
  let notificationData;
  try {
    notificationData = event.data ? JSON.parse(event.data.text()) : {};
  } catch (error) {
    console.warn('Failed to parse push data:', error);
    notificationData = {};
  }
  
  const title = notificationData.title || 'ForexAlert Pro';
  const options = {
    body: notificationData.body || 'New forex signal available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now(),
      ...notificationData.data
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
  
  console.log('📱 Showing notification:', title, options);
  
  event.waitUntil(
    self.registration.showNotification(title, options)
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
