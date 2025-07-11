
import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { Button } from '@/components/ui/button';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 60,
  className = ''
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const { triggerHaptic } = useNativeFeatures();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollTop = container.scrollTop;
    lastScrollTop.current = scrollTop;
    
    // Only enable pull-to-refresh when at the very top
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;

    const currentScrollTop = container.scrollTop;
    const touchY = e.touches[0].clientY;
    
    // If user started at top and is pulling down
    if (isPulling && currentScrollTop === 0) {
      const distance = Math.max(0, touchY - startY.current);
      
      if (distance > 10) { // Only prevent default after some threshold
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
        
        // Trigger haptic feedback when reaching threshold
        if (distance >= threshold && pullDistance < threshold) {
          triggerHaptic();
        }
      }
    } else if (isPulling && currentScrollTop > 0) {
      // User started scrolling normally, cancel pull-to-refresh
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, threshold, triggerHaptic, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showRefreshIcon = pullDistance > 10;

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ 
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        transform: `translateY(${Math.min(pullDistance * 0.5, 30)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Manual refresh button - always visible */}
      <div className="sticky top-0 z-50 flex justify-end p-2 bg-background/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Pull to refresh indicator */}
      {showRefreshIcon && (
        <div 
          className={`absolute top-12 left-1/2 transform -translate-x-1/2 -translate-y-full
            flex items-center justify-center w-10 h-10 rounded-full 
            bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30
            transition-all duration-200 z-50
            ${pullProgress >= 1 ? 'bg-emerald-500/30' : ''}
          `}
          style={{
            transform: `translateX(-50%) translateY(${Math.min(pullDistance - 20, 10)}px)`,
            opacity: Math.min(pullProgress * 2, 1)
          }}
        >
          <RefreshCw 
            className={`w-5 h-5 text-emerald-400 transition-transform duration-200
              ${isRefreshing ? 'animate-spin' : ''}
              ${pullProgress >= 1 ? 'scale-110' : ''}
            `}
            style={{
              transform: `rotate(${pullProgress * 180}deg)`
            }}
          />
        </div>
      )}
      
      <div className="px-2 pb-2">
        {children}
      </div>
    </div>
  );
};
