
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
    console.log('🛣️ MobileRouteManager: Initializing routing');
    console.log('🛣️ Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');
    console.log('🛣️ Initial URL:', window.location.href);
    console.log('🛣️ Initial pathname:', window.location.pathname);

    // Handle routing for both web and mobile
    const currentPath = window.location.pathname;
    
    // For mobile apps, handle common problematic URLs
    if (Capacitor.isNativePlatform()) {
      // Handle file:// URLs or android_asset URLs
      if (window.location.protocol === 'file:' || 
          window.location.href.includes('android_asset') ||
          window.location.href.includes('capacitor://')) {
        console.log('🛣️ Mobile app detected, ensuring proper routing');
        
        // If we're not on a valid route, redirect to home
        if (!this.validateRoute(currentPath)) {
          console.log('🛣️ Invalid route detected, redirecting to home');
          window.history.replaceState(null, '', '/');
        }
      }
    }

    // Add listener for route changes
    window.addEventListener('popstate', (event) => {
      const newPath = window.location.pathname;
      console.log('🛣️ Route changed to:', newPath);
      
      if (!this.validateRoute(newPath)) {
        console.log('🛣️ Invalid route detected on navigation, redirecting to home');
        window.history.replaceState(null, '', '/');
      }
    });
  }
}
