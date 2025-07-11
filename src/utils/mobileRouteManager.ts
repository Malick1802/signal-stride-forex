
import { Capacitor } from '@capacitor/core';

export class MobileRouteManager {
  static validateRoute(path: string): boolean {
    // Extract pathname without query parameters for validation
    const pathname = path.split('?')[0];
    
    // Valid routes for the app
    const validRoutes = [
      '/',
      '/test',
      '/index.html',
      '/app',
      '/dashboard',
      '/signals',
      '/settings',
      '/profile',
      '/auth',
      '/login',
      '/signup',
      '/subscription',
      '/affiliate',
      '/admin'
    ];
    
    console.log('🛣️ MobileRouteManager: Validating route:', pathname);
    
    // Check if route is in valid routes list or starts with valid query parameters
    const isValid = validRoutes.includes(pathname) || 
                   pathname.startsWith('/?') ||
                   validRoutes.some(route => pathname.startsWith(route + '/'));
    
    console.log('🛣️ MobileRouteManager: Route valid:', isValid);
    
    return isValid;
  }

  static getDefaultRoute(): string {
    console.log('🛣️ MobileRouteManager: Getting default route');
    return '/';
  }

  static handleInvalidRoute(path: string): string {
    console.log('🛣️ MobileRouteManager: Handling invalid route:', path);
    
    // Log detailed route information
    console.log('🛣️ Current location:', {
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
    });

    // For mobile apps, try to handle common routing patterns
    if (Capacitor.isNativePlatform()) {
      // Handle common mobile app URL patterns
      if (path.includes('index.html') || path.includes('android_asset')) {
        console.log('🛣️ Mobile app detected common URL pattern, redirecting to home');
        return '/';
      }
      
      // Handle deep linking attempts
      if (path.startsWith('/app/') || path.startsWith('/www/')) {
        console.log('🛣️ Mobile app deep link detected, redirecting to home');
        return '/';
      }
    }

    // Always redirect to home for invalid routes
    return '/';
  }

  static initializeMobileRouting(): void {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    const currentHref = window.location.href;
    
    console.log('🔧 MobileRouteManager: Initializing mobile routing', { 
      currentPath, 
      currentHash,
      currentHref,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    });

    // For mobile apps using HashRouter, check hash instead of pathname
    if (Capacitor.isNativePlatform()) {
      const hashPath = currentHash.replace('#', '') || '/';
      console.log('🔧 MobileRouteManager: Mobile app detected, using hash routing', { hashPath });
      
      if (!this.validateRoute(hashPath)) {
        console.log('🔧 MobileRouteManager: Invalid hash route, redirecting to home', { from: hashPath });
        window.location.hash = '#/';
        return;
      }
    }

    // Handle specific mobile URL patterns
    if (currentHref.includes('file://') || 
        currentHref.includes('android_asset') || 
        currentHref.includes('capacitor://')) {
      console.log('🔧 MobileRouteManager: Detected mobile URL scheme');
      
      // Ensure we start with the correct hash route
      if (!currentHash || currentHash === '#') {
        console.log('🔧 MobileRouteManager: No hash found, setting default');
        window.location.hash = '#/';
        return;
      }
    }

    // Listen for hash changes in mobile environment
    if (Capacitor.isNativePlatform()) {
      window.addEventListener('hashchange', (event) => {
        const newHash = window.location.hash.replace('#', '') || '/';
        console.log('🔧 MobileRouteManager: Hash change detected', { newHash });
        
        if (!this.validateRoute(newHash)) {
          console.log('🔧 MobileRouteManager: Invalid hash route, redirecting', {
            from: newHash,
            to: '/'
          });
          window.location.hash = '#/';
        }
      });
    }
  }
}
