
// Enhanced Service Worker with Dynamic Asset Management
const CACHE_VERSION = '2025-01-12-v1';
const CACHE_NAME = `forex-signals-${CACHE_VERSION}`;
const OFFLINE_CACHE_NAME = `forex-signals-offline-${CACHE_VERSION}`;

// Dynamic asset discovery - no hardcoded paths
const CORE_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

// Chunk loading retry logic
const chunkRetryMap = new Map();
const MAX_RETRY_ATTEMPTS = 3;

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/signals/,
  /\/api\/market-data/
];

// Install event - cache core assets with fallback
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📱 Caching core assets...');
        // Only cache essential assets, discover others dynamically
        return cache.addAll(CORE_ASSETS.filter(asset => {
          try {
            new URL(asset, self.location.origin);
            return true;
          } catch {
            console.warn('📱 Skipping invalid asset:', asset);
            return false;
          }
        }));
      })
      .then(() => {
        console.log('📱 Service Worker installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker installation failed:', error);
        // Continue with installation even if caching fails
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

// Enhanced fetch with chunk retry and fallback logic
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
    
    // Handle JavaScript chunks with retry logic
    if (url.pathname.includes('.js') && (url.pathname.includes('chunk-') || url.pathname.includes('node_modules'))) {
      event.respondWith(handleJavaScriptRequest(request));
      return;
    }
    
    // Handle API requests with network-first strategy
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      event.respondWith(handleApiRequest(request));
      return;
    }
  } catch (error) {
    console.error('❌ URL parsing failed:', error);
    // Don't respond to invalid URLs, let them fail naturally
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

// JavaScript chunk handling with retry logic
async function handleJavaScriptRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname;
  
  try {
    // Try cache first for chunks
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network with retry logic
    const response = await fetchWithRetry(request, cacheKey);
    
    // Cache successful responses
    if (response.ok) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      } catch (cacheError) {
        console.warn('📱 Cache put failed for chunk:', cacheError);
      }
    }
    
    return response;
  } catch (error) {
    console.error('📱 JavaScript chunk loading failed:', error);
    
    // Return a fallback chunk that prevents the app from breaking
    return new Response(`
      console.error('Chunk loading failed: ${cacheKey}');
      // Fallback chunk - try to recover gracefully
      if (window.__CHUNK_LOAD_ERROR__) {
        window.__CHUNK_LOAD_ERROR__(new Error('${cacheKey} failed to load'));
      }
    `, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Fetch with exponential backoff retry
async function fetchWithRetry(request, cacheKey) {
  const maxRetries = chunkRetryMap.get(cacheKey) || 0;
  
  if (maxRetries >= MAX_RETRY_ATTEMPTS) {
    throw new Error(`Max retries exceeded for ${cacheKey}`);
  }
  
  try {
    const response = await fetch(request);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Reset retry count on success
    chunkRetryMap.delete(cacheKey);
    return response;
  } catch (error) {
    const retryCount = maxRetries + 1;
    chunkRetryMap.set(cacheKey, retryCount);
    
    console.warn(`📱 Fetch attempt ${retryCount} failed for ${cacheKey}:`, error);
    
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      // Exponential backoff: 500ms, 1000ms, 2000ms
      const delay = Math.min(500 * Math.pow(2, retryCount - 1), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return fetchWithRetry(request, cacheKey);
    }
    
    throw error;
  }
}

// API request handler
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    if (!response.ok) {
      return response;
    }
    
    // Clone the response for caching with error handling
    try {
      const responseClone = response.clone();
      
      // Cache successful responses with error handling
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      if (isSafeRequest(request)) {
        await cache.put(request, responseClone);
      }
    } catch (cacheError) {
      console.warn('📱 Cache put failed:', cacheError);
    }
    
    return response;
  } catch (networkError) {
    console.warn('📱 Network request failed:', networkError);
    
    // Network failed, try cache
    try {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('📱 Serving from cache:', request.url);
        return cachedResponse;
      }
    } catch (cacheError) {
      console.error('📱 Cache match failed:', cacheError);
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
  }
}
