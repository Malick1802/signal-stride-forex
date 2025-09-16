
import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';

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
  const { triggerHaptic } = useNativeFeatures();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      // Trigger haptic feedback when reaching threshold
      if (distance >= threshold && pullDistance < threshold) {
        triggerHaptic();
      }
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

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        transform: `translateY(${Math.min(pullDistance * 0.5, 30)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      {showRefreshIcon && (
        <div 
          className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full
            flex items-center justify-center w-10 h-10 rounded-full 
            bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30
            transition-all duration-200 z-50 pointer-events-none
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
      
      {children}
    </div>
  );
};
