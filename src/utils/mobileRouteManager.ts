
import { Capacitor } from '@capacitor/core';

interface RouteState {
  lastValidRoute: string;
  routeHistory: string[];
  invalidRouteCount: number;
  lastRouteChange: number;
}

export class MobileRouteManager {
  private static readonly ROUTE_STATE_KEY = 'mobile_route_state';
  private static readonly MAX_INVALID_ROUTES = 3;
  private static readonly ROUTE_RECOVERY_TIMEOUT = 5000; // 5 seconds

  static validateRoute(path: string): boolean {
    const validRoutes = ['/', '/test', '/index.html', '/app'];
    console.log('🛣️ MobileRouteManager: Validating route:', path);
    
    const isValid = validRoutes.includes(path) || path.startsWith('/?');
    console.log('🛣️ MobileRouteManager: Route valid:', isValid);
    
    return isValid;
  }

  static getRouteState(): RouteState {
    try {
      const stored = localStorage.getItem(this.ROUTE_STATE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('🛣️ Failed to load route state:', error);
    }
    
    return {
      lastValidRoute: '/',
      routeHistory: ['/'],
      invalidRouteCount: 0,
      lastRouteChange: Date.now()
    };
  }

  static saveRouteState(state: RouteState): void {
    try {
      localStorage.setItem(this.ROUTE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('🛣️ Failed to save route state:', error);
    }
  }

  static recordValidRoute(path: string): void {
    const state = this.getRouteState();
    state.lastValidRoute = path;
    state.routeHistory = [path, ...state.routeHistory.slice(0, 4)]; // Keep last 5 routes
    state.invalidRouteCount = 0;
    state.lastRouteChange = Date.now();
    this.saveRouteState(state);
    console.log('🛣️ Recorded valid route:', path);
  }

  static getDefaultRoute(): string {
    // Try to get last valid route from state
    const state = this.getRouteState();
    const timeSinceLastChange = Date.now() - state.lastRouteChange;
    
    // If it's been less than recovery timeout, use last valid route
    if (timeSinceLastChange < this.ROUTE_RECOVERY_TIMEOUT && state.lastValidRoute !== '/') {
      console.log('🛣️ MobileRouteManager: Recovering to last valid route:', state.lastValidRoute);
      return state.lastValidRoute;
    }
    
    console.log('🛣️ MobileRouteManager: Using default route');
    return '/';
  }

  static handleInvalidRoute(path: string): string {
    console.log('🛣️ MobileRouteManager: Handling invalid route:', path);
    
    const state = this.getRouteState();
    state.invalidRouteCount++;
    
    // Log detailed route information
    console.log('🛣️ Current location:', {
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin,
      invalidCount: state.invalidRouteCount
    });

    // If too many invalid routes, clear state and go to home
    if (state.invalidRouteCount > this.MAX_INVALID_ROUTES) {
      console.warn('🛣️ Too many invalid routes, resetting to home');
      this.clearRouteState();
      return '/';
    }

    this.saveRouteState(state);
    
    // Try to recover to last valid route
    const recoveryRoute = this.getDefaultRoute();
    console.log('🛣️ Recovering to route:', recoveryRoute);
    return recoveryRoute;
  }

  static clearRouteState(): void {
    try {
      localStorage.removeItem(this.ROUTE_STATE_KEY);
      console.log('🛣️ Route state cleared');
    } catch (error) {
      console.warn('🛣️ Failed to clear route state:', error);
    }
  }

  static handleAppResume(): void {
    if (!Capacitor.isNativePlatform()) return;
    
    console.log('🛣️ App resumed - checking route state');
    const currentPath = window.location.pathname;
    
    if (!this.validateRoute(currentPath)) {
      console.log('🛣️ Invalid route after resume, attempting recovery');
      const recoveryRoute = this.getDefaultRoute();
      window.history.replaceState(null, '', recoveryRoute);
    } else {
      this.recordValidRoute(currentPath);
    }
  }

  static handleRouteChange(path: string): void {
    if (this.validateRoute(path)) {
      this.recordValidRoute(path);
    } else {
      const recoveryRoute = this.handleInvalidRoute(path);
      if (recoveryRoute !== path) {
        // Prevent infinite loops by checking if we're already trying to navigate
        setTimeout(() => {
          if (window.location.pathname === path) {
            window.history.replaceState(null, '', recoveryRoute);
          }
        }, 100);
      }
    }
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
      console.log('🛣️ MobileRouteManager: Invalid initial route, attempting recovery');
      const recoveryRoute = this.getDefaultRoute();
      window.history.replaceState(null, '', recoveryRoute);
    } else {
      this.recordValidRoute(currentPath);
    }

    // Set up navigation interception for better route management
    this.setupNavigationInterception();
  }

  private static setupNavigationInterception(): void {
    // Override pushState and replaceState to track route changes
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function(state, title, url) {
      originalPushState(state, title, url);
      if (url && typeof url === 'string') {
        MobileRouteManager.handleRouteChange(url);
      }
    };

    history.replaceState = function(state, title, url) {
      originalReplaceState(state, title, url);
      if (url && typeof url === 'string') {
        MobileRouteManager.handleRouteChange(url);
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      MobileRouteManager.handleRouteChange(window.location.pathname);
    });
  }
}
