
interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;
  private installListeners: Array<(canInstall: boolean) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e as any;
      this.notifyInstallListeners(true);
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyInstallListeners(false);
    });

    // Check if already installed
    this.checkIfInstalled();

    // Register service worker
    this.registerServiceWorker();
  }

  private async checkIfInstalled() {
    // Check if running in standalone mode (installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 PWA is running in standalone mode');
      this.isInstalled = true;
      return;
    }

    // Check if running in WebView (mobile app)
    if (window.navigator.standalone === true) {
      console.log('📱 PWA is running in iOS standalone mode');
      this.isInstalled = true;
      return;
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Register the service worker from the public directory
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('📱 Service Worker registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('📱 Service Worker update found');
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('📱 New Service Worker installed, refresh recommended');
                // Notify user about update
                this.notifyUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  private notifyUpdate() {
    // You can dispatch a custom event or use a toast notification
    const event = new CustomEvent('pwa-update-available');
    window.dispatchEvent(event);
  }

  private notifyInstallListeners(canInstall: boolean) {
    this.installListeners.forEach(listener => listener(canInstall));
  }

  public canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  public async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('⚠️ No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('📱 Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ PWA install failed:', error);
      return false;
    }
  }

  public onInstallAvailable(callback: (canInstall: boolean) => void) {
    this.installListeners.push(callback);
    
    // Immediately call with current state
    callback(this.canInstall());
    
    // Return unsubscribe function
    return () => {
      const index = this.installListeners.indexOf(callback);
      if (index > -1) {
        this.installListeners.splice(index, 1);
      }
    };
  }

  public getInstallationStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: this.canInstall(),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches
    };
  }
}

export const pwaManager = new PWAManager();
