import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  networkLatency: number;
  batteryLevel?: number;
  connectionType?: string;
}

export const useMobilePerformanceOptimizer = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    networkLatency: 0
  });
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // Detect device capabilities
  const detectDeviceCapabilities = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform();
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Detect low-end devices
    const isLowEndDevice = (
      (navigator as any).deviceMemory < 4 || // Less than 4GB RAM
      userAgent.includes('android') && (
        userAgent.includes('go') || // Android Go
        userAgent.includes('lite')
      )
    );

    // Detect network speed
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const isSlowConnection = connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.downlink < 1.5
    );

    // Set optimization level
    if (isLowEndDevice || isSlowConnection) {
      setOptimizationLevel('high');
    } else if (isNative) {
      setOptimizationLevel('medium');
    } else {
      setOptimizationLevel('low');
    }

    console.log('📱 Device capabilities detected:', {
      isNative,
      isLowEndDevice,
      isSlowConnection,
      memoryGB: (navigator as any).deviceMemory || 'unknown',
      connection: connection?.effectiveType || 'unknown'
    });
  }, []);

  // Monitor performance metrics
  const monitorPerformance = useCallback(() => {
    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      setPerformanceMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(memoryUsage)
      }));
    }

    // Network latency
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setPerformanceMetrics(prev => ({
        ...prev,
        networkLatency: connection.rtt || 0,
        connectionType: connection.effectiveType
      }));
    }
  }, []);

  // Apply mobile optimizations
  const applyOptimizations = useCallback(() => {
    if (isOptimized) return;

    console.log(`🚀 Applying ${optimizationLevel} performance optimizations...`);

    // High optimization for low-end devices
    if (optimizationLevel === 'high') {
      // Reduce animation duration
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      
      // Disable expensive animations
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0.1s !important;
          animation-delay: 0s !important;
          transition-duration: 0.1s !important;
          transition-delay: 0s !important;
        }
        .animate-spin {
          animation: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Reduce image quality
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.dataset.optimized) {
          img.style.imageRendering = 'pixelated';
          img.dataset.optimized = 'true';
        }
      });
    }

    // Medium optimization for native apps
    if (optimizationLevel === 'medium') {
      // Reduce animation duration slightly
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
      
      // Enable hardware acceleration for key elements
      const keyElements = document.querySelectorAll('.card, .button, [data-testid="signal-card"]');
      keyElements.forEach(el => {
        (el as HTMLElement).style.transform = 'translateZ(0)';
        (el as HTMLElement).style.willChange = 'transform, opacity';
      });
    }

    // Enable lazy loading for images
    const lazyImages = document.querySelectorAll('img:not([loading])');
    lazyImages.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });

    // Optimize scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });

    setIsOptimized(true);
    console.log(`✅ ${optimizationLevel} optimizations applied`);
  }, [optimizationLevel, isOptimized]);

  // Battery optimization for native apps
  const optimizeForBattery = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Simplified battery optimization without external device plugin
      const batteryInfo = (navigator as any).getBattery ? await (navigator as any).getBattery() : null;
      
      if (batteryInfo && batteryInfo.level) {
        setPerformanceMetrics(prev => ({
          ...prev,
          batteryLevel: batteryInfo.level
        }));

        // Aggressive optimizations for low battery
        if (batteryInfo.level < 0.2) {
          console.log('🔋 Low battery detected - applying aggressive optimizations');
          
          // Reduce refresh rates
          const intervals = (window as any).__intervals || [];
          intervals.forEach((interval: number) => {
            if (interval < 10000) { // Slow down intervals less than 10s
              clearInterval(interval);
            }
          });

          // Disable non-essential animations
          document.documentElement.style.setProperty('--animation-duration', '0s');
        }
      }
    } catch (error) {
      console.warn('⚠️ Battery optimization not available:', error);
    }
  }, []);

  // Initialize optimizations
  useEffect(() => {
    detectDeviceCapabilities();
  }, [detectDeviceCapabilities]);

  useEffect(() => {
    if (optimizationLevel) {
      applyOptimizations();
      optimizeForBattery();
    }
  }, [optimizationLevel, applyOptimizations, optimizeForBattery]);

  // Performance monitoring interval
  useEffect(() => {
    const interval = setInterval(monitorPerformance, 5000);
    return () => clearInterval(interval);
  }, [monitorPerformance]);

  return {
    performanceMetrics,
    optimizationLevel,
    isOptimized,
    applyOptimizations,
    optimizeForBattery
  };
};