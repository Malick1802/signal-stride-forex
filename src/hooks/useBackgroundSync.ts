
import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMobileConnectivity } from './useMobileConnectivity';
import { useOfflineSignals } from './useOfflineSignals';

interface BackgroundSyncOptions {
  onSignalsFetched?: (signals: any[]) => void;
  syncInterval?: number;
  enableBackgroundFetch?: boolean;
}

export const useBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const { isConnected } = useMobileConnectivity();
  const { cacheSignals } = useOfflineSignals();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  
  const {
    onSignalsFetched,
    syncInterval = 2 * 60 * 1000, // 2 minutes
    enableBackgroundFetch = true
  } = options;

  const performBackgroundSync = useCallback(async () => {
    if (!isConnected) {
      console.log('📡 Skipping background sync - offline');
      return;
    }

    const now = Date.now();
    if (now - lastSyncRef.current < syncInterval) {
      console.log('📡 Skipping background sync - too frequent');
      return;
    }

    try {
      console.log('📡 Starting background sync...');
      lastSyncRef.current = now;

      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Add timeout and retry logic
      const maxRetries = 2;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { data: signals, error } = await supabase
            .from('trading_signals')
            .select('*')
            .eq('status', 'active')
            .eq('is_centralized', true)
            .is('user_id', null)
            .order('confidence', { ascending: false })
            .limit(20);

          if (error) throw error;

          if (signals && signals.length > 0) {
            await cacheSignals(signals);
            console.log(`📡 Background sync completed - ${signals.length} signals cached`);
            onSignalsFetched?.(signals);
          } else {
            console.log('📡 Background sync completed - no signals found');
          }
          return; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            console.log(`📡 Retry ${attempt}/${maxRetries} after error:`, error);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error('❌ Background sync failed after retries:', error);
    }
  }, [isConnected, syncInterval, cacheSignals, onSignalsFetched]);

  const setupAppStateListeners = useCallback(() => {
    // Listen for visibility changes (web)
    const handleVisibilityChange = () => {
      if (!document.hidden && isConnected) {
        console.log('📱 App became visible - triggering sync');
        performBackgroundSync();
      }
    };

    // Listen for focus events
    const handleFocus = () => {
      if (isConnected) {
        console.log('📱 App focused - triggering sync');
        performBackgroundSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // For Capacitor apps, listen to app state changes if available
    if (Capacitor.isNativePlatform()) {
      try {
        // Use Capacitor's App plugin for native app state changes
        import('@capacitor/app').then(({ App }) => {
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive && isConnected) {
              console.log('📱 Native app became active - triggering sync');
              performBackgroundSync();
            }
          });
        }).catch(() => {
          console.warn('⚠️ App plugin not available');
        });
      } catch (error) {
        console.warn('⚠️ Native app state monitoring not available:', error);
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isConnected, performBackgroundSync]);

  // Set up foreground sync interval with improved debouncing
  useEffect(() => {
    // Clear any existing interval first
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (isConnected && enableBackgroundFetch) {
      console.log(`📡 Setting up sync interval: ${syncInterval}ms`);
      
      // Increased minimum interval to reduce server load
      const minInterval = Math.max(syncInterval, 5 * 60 * 1000); // Minimum 5 minutes
      
      syncIntervalRef.current = setInterval(() => {
        performBackgroundSync();
      }, minInterval);

      // Perform initial sync after a longer delay to avoid startup rush
      setTimeout(() => {
        performBackgroundSync();
      }, 5000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isConnected, enableBackgroundFetch, syncInterval, performBackgroundSync]);

  // Set up app state listeners on mount
  useEffect(() => {
    return setupAppStateListeners();
  }, [setupAppStateListeners]);

  return {
    performBackgroundSync,
    lastSync: lastSyncRef.current
  };
};
