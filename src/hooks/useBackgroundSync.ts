
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
      
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null)
        .order('confidence', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      if (signals && signals.length > 0) {
        await cacheSignals(signals);
        console.log(`📡 Background sync completed - ${signals.length} signals cached`);
        onSignalsFetched?.(signals);
      } else {
        console.log('📡 Background sync completed - no signals found');
      }
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }, [isConnected, syncInterval, cacheSignals, onSignalsFetched]);

  const setupAppStateListeners = useCallback(() => {
    const cleanupFns: (() => void)[] = [];
    
    // Enhanced visibility change handling
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      console.log(`📱 Visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && isConnected) {
        console.log('📱 App became visible - triggering sync with delay');
        // Add delay to allow app to fully resume
        setTimeout(performBackgroundSync, 1000);
      }
    };

    // Enhanced focus handling
    const handleFocus = () => {
      if (isConnected) {
        console.log('📱 App focused - triggering sync');
        setTimeout(performBackgroundSync, 500);
      }
    };

    // Enhanced page show handling (for mobile back/forward)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isConnected) {
        console.log('📱 Page restored from cache - triggering sync');
        setTimeout(performBackgroundSync, 800);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    
    cleanupFns.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    });

    // Enhanced Capacitor app state handling
    if (Capacitor.isNativePlatform()) {
      const setupNativeListeners = async () => {
        try {
          const { App } = await import('@capacitor/app');
          
          const stateListener = await App.addListener('appStateChange', ({ isActive }) => {
            console.log(`📱 Native app state changed: ${isActive ? 'active' : 'inactive'}`);
            if (isActive && isConnected) {
              console.log('📱 Native app became active - triggering comprehensive sync');
              // More aggressive sync after app resume
              setTimeout(performBackgroundSync, 1500);
            }
          });

          const resumeListener = await App.addListener('resume', () => {
            console.log('📱 Native app resumed');
            if (isConnected) {
              setTimeout(performBackgroundSync, 2000);
            }
          });

          cleanupFns.push(() => {
            stateListener.remove();
            resumeListener.remove();
          });
        } catch (error) {
          console.warn('⚠️ Native app state monitoring not available:', error);
        }
      };

      setupNativeListeners();
    }

    return () => {
      cleanupFns.forEach(cleanup => cleanup());
    };
  }, [isConnected, performBackgroundSync]);

  // Set up foreground sync interval
  useEffect(() => {
    if (isConnected && enableBackgroundFetch) {
      console.log(`📡 Setting up sync interval: ${syncInterval}ms`);
      
      syncIntervalRef.current = setInterval(() => {
        performBackgroundSync();
      }, syncInterval);

      // Perform initial sync
      performBackgroundSync();
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
