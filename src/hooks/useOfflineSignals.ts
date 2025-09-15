
import { useState, useEffect, useCallback } from 'react';
import { offlineSignalCache } from '@/utils/offlineSignalCache';
import { useConnectionManager } from './useConnectionManager';

interface OfflineSignalsState {
  cachedSignals: any[];
  cacheStats: {
    totalSignals: number;
    lastSync: number;
    cacheSize: number;
    isStale: boolean;
  };
  isUsingCache: boolean;
  hasCache: boolean;
}

export const useOfflineSignals = () => {
  const { connectionState } = useConnectionManager();
  const { isOnline, isSupabaseConnected } = connectionState;
  const isConnected = isOnline && isSupabaseConnected;
  const [offlineState, setOfflineState] = useState<OfflineSignalsState>({
    cachedSignals: [],
    cacheStats: {
      totalSignals: 0,
      lastSync: 0,
      cacheSize: 0,
      isStale: true
    },
    isUsingCache: false,
    hasCache: false
  });

  const loadCachedSignals = useCallback(async () => {
    try {
      console.log('📦 Loading cached signals...');
      const [cachedSignals, cacheStats] = await Promise.all([
        offlineSignalCache.getCachedSignals(),
        offlineSignalCache.getCacheStats()
      ]);

      setOfflineState(prev => ({
        ...prev,
        cachedSignals,
        cacheStats,
        hasCache: cachedSignals.length > 0,
        isUsingCache: !isConnected && cachedSignals.length > 0
      }));

      console.log(`📦 Loaded ${cachedSignals.length} cached signals`);
    } catch (error) {
      console.error('❌ Error loading cached signals:', error);
    }
  }, [isConnected]);

  const cacheSignals = useCallback(async (signals: any[]) => {
    if (signals.length > 0) {
      try {
        await offlineSignalCache.cacheSignals(signals);
        await loadCachedSignals();
      } catch (error) {
        console.error('❌ Error caching signals:', error);
      }
    }
  }, [loadCachedSignals]);

  const clearCache = useCallback(async () => {
    try {
      await offlineSignalCache.clearCache();
      await loadCachedSignals();
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }, [loadCachedSignals]);

  // Load cached signals on mount and when connection changes
  useEffect(() => {
    loadCachedSignals();
  }, [loadCachedSignals]);

  // Update cache usage state when connection changes
  useEffect(() => {
    setOfflineState(prev => ({
      ...prev,
      isUsingCache: !isConnected && prev.hasCache
    }));
  }, [isConnected]);

  return {
    ...offlineState,
    cacheSignals,
    clearCache,
    refreshCache: loadCachedSignals
  };
};
