import React, { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ServiceWorkerState {
  isRegistered: boolean;
  isUpdated: boolean;
  error: string | null;
  registrationState: 'unregistered' | 'installing' | 'waiting' | 'active' | 'error';
}

export const useEnhancedServiceWorker = () => {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isUpdated: false,
    error: null,
    registrationState: 'unregistered'
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const clearCache = useCallback(async (cacheNames?: string[]) => {
    try {
      if ('caches' in window) {
        const availableCaches = await caches.keys();
        const cachesToClear = cacheNames || availableCaches;
        
        await Promise.all(
          cachesToClear.map(async (cacheName) => {
            if (availableCaches.includes(cacheName)) {
              await caches.delete(cacheName);
              console.log(`🗑️ Cleared cache: ${cacheName}`);
            }
          })
        );
        
        console.log('✅ Cache clearing completed');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return false;
    }
    return false;
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (!registration) {
      console.warn('⚠️ No service worker registration available for update');
      return false;
    }

    try {
      console.log('🔄 Updating service worker...');
      
      // Clear caches before update
      await clearCache();
      
      await registration.update();
      
      if (registration.waiting) {
        // Force the waiting service worker to become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page to apply updates
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Service worker update failed:', error);
      setSwState(prev => ({
        ...prev,
        error: `Update failed: ${(error as Error).message}`
      }));
      return false;
    }
  }, [registration, clearCache]);

  const handleCacheError = useCallback(async (request: Request, error: any) => {
    console.error('❌ Cache error for request:', request.url, error);
    
    // Clear potentially corrupted cache entries
    if ('caches' in window) {
      try {
        const cache = await caches.open('forex-signals-offline-v1');
        await cache.delete(request);
        console.log('🗑️ Removed corrupted cache entry:', request.url);
      } catch (cacheError) {
        console.error('❌ Failed to remove corrupted cache entry:', cacheError);
      }
    }
    
    // Return a meaningful error response
    return new Response(
      JSON.stringify({
        error: 'Cache Error',
        message: 'Data temporarily unavailable',
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      setSwState(prev => ({
        ...prev,
        error: 'Service Worker not supported',
        registrationState: 'error'
      }));
      return null;
    }

    try {
      console.log('📝 Registering enhanced service worker...');
      setSwState(prev => ({ ...prev, registrationState: 'installing' }));

      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      setRegistration(reg);
      
      // Handle installation
      reg.addEventListener('updatefound', () => {
        console.log('🔄 Service worker update found');
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            switch (newWorker.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  console.log('📱 New service worker available');
                  setSwState(prev => ({
                    ...prev,
                    isUpdated: true,
                    registrationState: 'waiting'
                  }));
                  
                  toast.info('App update available', {
                    description: 'Tap to restart and get the latest features',
                    action: {
                      label: 'Update',
                      onClick: updateServiceWorker
                    },
                    duration: Infinity
                  });
                } else {
                  console.log('✅ Service worker installed for the first time');
                  setSwState(prev => ({
                    ...prev,
                    isRegistered: true,
                    registrationState: 'active'
                  }));
                }
                break;
              case 'activated':
                console.log('✅ Service worker activated');
                setSwState(prev => ({
                  ...prev,
                  isRegistered: true,
                  registrationState: 'active'
                }));
                break;
              case 'redundant':
                console.log('❌ Service worker redundant');
                break;
            }
          });
        }
      });

      // Check for existing service worker
      if (reg.active) {
        console.log('✅ Service worker already active');
        setSwState(prev => ({
          ...prev,
          isRegistered: true,
          registrationState: 'active'
        }));
      }

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service worker controller changed');
        window.location.reload();
      });

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from service worker:', event.data);
        
        if (event.data?.type === 'CACHE_ERROR') {
          handleCacheError(event.data.request, event.data.error);
        }
      });

      return reg;
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      setSwState(prev => ({
        ...prev,
        error: `Registration failed: ${(error as Error).message}`,
        registrationState: 'error'
      }));
      return null;
    }
  }, [updateServiceWorker, handleCacheError]);

  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  return {
    ...swState,
    updateServiceWorker,
    clearCache,
    registration,
    isSupported: 'serviceWorker' in navigator
  };
};
