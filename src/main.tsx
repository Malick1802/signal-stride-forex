import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Safety valve: Clear stale cache and unregister service workers on startup
async function clearStaleCache() {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('🧹 Unregistering stale service worker...');
        await registration.unregister();
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        console.log('🧹 Clearing stale cache:', cacheName);
        await caches.delete(cacheName);
      }
    }
    
    console.log('✅ Cache cleanup completed');
  } catch (error) {
    console.warn('⚠️ Cache cleanup failed:', error);
  }
}

// Clear cache only once on app start
const hasCleared = sessionStorage.getItem('cache-cleared');
if (!hasCleared) {
  sessionStorage.setItem('cache-cleared', 'true');
  clearStaleCache().then(() => {
    // Force page reload after cache clear to ensure fresh assets
    window.location.reload();
    return;
    
    // Render app after cleanup
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
} else {
  // Normal render
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
