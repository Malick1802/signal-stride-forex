
import { Capacitor } from '@capacitor/core';

export class MobileRouteManager {
  static validateRoute(path: string): boolean {
    const validRoutes = ['/', '/test', '/index.html', '/app'];
    console.log('🛣️ MobileRouteManager: Validating route:', path);
    
    const isValid = validRoutes.includes(path) || path.startsWith('/?');
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
      origin: window.location.origin
    });

    // Always redirect to home for invalid routes
    return '/';
  }

  static initializeMobileRouting(): void {
    if (!Capacitor.isNativePlatform()) {
      console.log('🛣️ MobileRouteManager: Web platform, skipping mobile routing');
      return;
    }

    console.log('🛣️ MobileRouteManager: Initializing mobile routing');
    console.log('🛣️ Platform:', Capacitor.getPlatform());
    console.log('🛣️ Initial route:', window.location.pathname);

    // Handle any routing issues on app start
    const currentPath = window.location.pathname;
    if (!this.validateRoute(currentPath)) {
      console.log('🛣️ MobileRouteManager: Invalid initial route, redirecting to home');
      window.history.replaceState(null, '', '/');
    }
  }
}
