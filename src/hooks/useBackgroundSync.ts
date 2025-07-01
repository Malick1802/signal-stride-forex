
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

  const setupBackgroundMode = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !enableBackgroundFetch) {
      return;
    }

    try {
      const { BackgroundMode } = await import('@capacitor/background-mode');
      
      // Enable background mode
      await BackgroundMode.enable();
      console.log('📱 Background mode enabled');

      // Listen for app state changes
      BackgroundMode.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('📱 App became active - triggering sync');
          performBackgroundSync();
        }
      });
    } catch (error) {
      console.warn('⚠️ Background mode not available:', error);
    }
  }, [enableBackgroundFetch, performBackgroundSync]);

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

  // Set up background mode on mount
  useEffect(() => {
    setupBackgroundMode();
  }, [setupBackgroundMode]);

  // Handle visibility change for web
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isConnected) {
        console.log('📡 App became visible - triggering sync');
        performBackgroundSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, performBackgroundSync]);

  return {
    performBackgroundSync,
    lastSync: lastSyncRef.current
  };
};
