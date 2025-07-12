// Service Worker Registration and Management
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private updateCheckInterval?: NodeJS.Timeout;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      console.log('📱 Registering Service Worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        console.log('📱 Service Worker update found');
        this.handleUpdate();
      });

      // Check for updates periodically
      this.startUpdateChecks();

      console.log('✅ Service Worker registered successfully');
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  private handleUpdate(): void {
    if (!this.registration?.installing) return;

    const installingWorker = this.registration.installing;
    
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          this.showUpdateNotification();
        }
      }
    });
  }

  private showUpdateNotification(): void {
    // Create a simple update notification
    const updateBanner = document.createElement('div');
    updateBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #10b981, #059669);
      color: white;
      padding: 12px 16px;
      text-align: center;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    updateBanner.innerHTML = `
      <span>📱 App update available!</span>
      <button onclick="this.parentElement.remove(); window.location.reload();" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        margin-left: 12px;
        cursor: pointer;
      ">Update Now</button>
      <button onclick="this.parentElement.remove();" style="
        background: transparent;
        border: none;
        color: white;
        padding: 6px 12px;
        margin-left: 8px;
        cursor: pointer;
        opacity: 0.8;
      ">✕</button>
    `;

    document.body.appendChild(updateBanner);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (updateBanner.parentElement) {
        updateBanner.remove();
      }
    }, 10000);
  }

  private startUpdateChecks(): void {
    // Check for updates every 30 minutes
    this.updateCheckInterval = setInterval(async () => {
      if (this.registration) {
        try {
          await this.registration.update();
        } catch (error) {
          console.warn('Service Worker update check failed:', error);
        }
      }
    }, 30 * 60 * 1000);
  }

  async unregister(): Promise<void> {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    if (this.registration) {
      try {
        await this.registration.unregister();
        console.log('📱 Service Worker unregistered');
      } catch (error) {
        console.error('❌ Service Worker unregistration failed:', error);
      }
    }
  }

  // Clear all caches
  async clearCaches(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('📱 All caches cleared');
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
    }
  }

  // Force refresh with cache bypass
  forceRefresh(): void {
    this.clearCaches().then(() => {
      window.location.reload();
    });
  }
}

// Global instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Auto-register when module loads
if (typeof window !== 'undefined') {
  serviceWorkerManager.register();
}