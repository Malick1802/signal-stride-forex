
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

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then(response => {
            if (!response.ok) {
              return response;
            }
            
            const responseClone = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
