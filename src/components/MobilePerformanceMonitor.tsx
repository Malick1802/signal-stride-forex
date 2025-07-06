import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  componentCount: number;
  lastCleanup: number;
}

export const useMobilePerformanceMonitor = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0,
    lastCleanup: Date.now()
  });
  
  const cleanupTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const observersRef = useRef<Set<MutationObserver | ResizeObserver | IntersectionObserver>>(new Set());

  // Memory monitoring
  const monitorMemoryUsage = () => {
    if (!Capacitor.isNativePlatform()) return;
    
    // @ts-ignore - performance.memory is not in all browsers
    if (performance.memory) {
      // @ts-ignore
      const used = performance.memory.usedJSHeapSize;
      // @ts-ignore
      const limit = performance.memory.jsHeapSizeLimit;
      const usage = (used / limit) * 100;
      
      metricsRef.current.memoryUsage = usage;
      
      if (usage > 85) {
        console.warn('📱 High memory usage detected:', usage.toFixed(1) + '%');
        performCleanup();
      }
    }
  };

  // Component cleanup
  const performCleanup = () => {
    const now = Date.now();
    const timeSinceLastCleanup = now - metricsRef.current.lastCleanup;
    
    // Don't cleanup too frequently
    if (timeSinceLastCleanup < 30000) return; // 30 seconds
    
    console.log('📱 Performing mobile app cleanup...');
    
    // Clear stale localStorage entries
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('temp_') ||
          key.includes('cache_') ||
          key.includes('stale_') ||
          key.startsWith('debug_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`📱 Cleaned up ${keysToRemove.length} stale cache entries`);
      }
    } catch (error) {
      console.warn('📱 Cache cleanup failed:', error);
    }
    
    // Clean up abandoned timers
    cleanupTimersRef.current.forEach(timer => {
      clearTimeout(timer);
    });
    cleanupTimersRef.current.clear();
    
    // Clean up observers
    observersRef.current.forEach(observer => {
      observer.disconnect();
    });
    observersRef.current.clear();
    
    // Force garbage collection if available
    // @ts-ignore
    if (window.gc) {
      // @ts-ignore
      window.gc();
      console.log('📱 Forced garbage collection');
    }
    
    metricsRef.current.lastCleanup = now;
  };

  // Register cleanup functions
  const registerTimer = (timer: NodeJS.Timeout) => {
    cleanupTimersRef.current.add(timer);
  };

  const registerObserver = (observer: MutationObserver | ResizeObserver | IntersectionObserver) => {
    observersRef.current.add(observer);
  };

  // Performance monitoring setup
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Monitor memory usage periodically
    const memoryTimer = setInterval(monitorMemoryUsage, 10000); // Every 10 seconds
    registerTimer(memoryTimer);

    // Cleanup on app pause/background
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 App going to background - performing cleanup');
        performCleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup performance observer for rendering metrics
    if ('PerformanceObserver' in window) {
      try {
        const perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              metricsRef.current.renderTime = entry.duration;
            }
          }
        });
        
        perfObserver.observe({ entryTypes: ['measure'] });
        
        return () => {
          perfObserver.disconnect();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          clearInterval(memoryTimer);
          performCleanup();
        };
      } catch (error) {
        console.warn('📱 Performance observer not available:', error);
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(memoryTimer);
      performCleanup();
    };
  }, []);

  return {
    metrics: metricsRef.current,
    performCleanup,
    registerTimer,
    registerObserver
  };
};

// HOC for performance monitoring
export const withMobilePerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    useMobilePerformanceMonitor();
    return <Component {...props} />;
  };
};