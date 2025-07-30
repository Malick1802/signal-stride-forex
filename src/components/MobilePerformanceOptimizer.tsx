
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Lazy load components for better performance
const LazySignalCard = lazy(() => import('./SignalCard'));
const LazyRealTimeChart = lazy(() => import('./RealTimeChart'));

interface MobilePerformanceOptimizerProps {
  children: React.ReactNode;
  enableVirtualization?: boolean;
  enablePreloading?: boolean;
}

export const MobilePerformanceOptimizer: React.FC<MobilePerformanceOptimizerProps> = ({
  children,
  enableVirtualization = true,
  enablePreloading = true
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    memoryUsage: 0,
    renderTime: 0,
    isNative: false
  });

  useEffect(() => {
    // Detect if we're running in native mode
    const isNative = Capacitor.isNativePlatform();
    
    // Monitor performance metrics
    const measurePerformance = () => {
      const startTime = performance.now();
      
      // Measure memory usage if available
      const memInfo = (performance as any).memory;
      const memoryUsage = memInfo ? memInfo.usedJSHeapSize / 1024 / 1024 : 0;
      
      setPerformanceMetrics({
        memoryUsage,
        renderTime: performance.now() - startTime,
        isNative
      });
    };

    measurePerformance();
    
    // Set up performance monitoring interval
    const interval = setInterval(measurePerformance, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Optimize for mobile devices
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Native mobile optimizations
      document.body.style.overscrollBehavior = 'none';
      document.body.style.touchAction = 'pan-x pan-y';
      
      // Disable text selection on mobile for better UX
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }

    return () => {
      // Cleanup
      if (Capacitor.isNativePlatform()) {
        document.body.style.overscrollBehavior = '';
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }
    };
  }, []);

  return (
    <div className="mobile-performance-wrapper">
      {/* Optimized content rendering */}
      <Suspense 
        fallback={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
};

// Virtual scrolling component for large lists
export const VirtualSignalList: React.FC<{
  signals: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (signal: any, index: number) => React.ReactNode;
}> = ({ signals, itemHeight, containerHeight, renderItem }) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    signals.length
  );
  
  const visibleSignals = signals.slice(visibleStart, visibleEnd);
  
  return (
    <div 
      className="virtual-scroll-container"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: signals.length * itemHeight, position: 'relative' }}>
        {visibleSignals.map((signal, index) => (
          <div
            key={signal.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(signal, visibleStart + index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobilePerformanceOptimizer;
