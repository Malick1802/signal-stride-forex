import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

interface AndroidSyncState {
  isConnected: boolean;
  lastSignalUpdate: number;
  lastPriceUpdate: number;
  isBackgroundSyncing: boolean;
  connectionRetries: number;
}

export const useAndroidRealTimeSync = () => {
  const { toast } = useToast();
  const [syncState, setSyncState] = useState<AndroidSyncState>({
    isConnected: false,
    lastSignalUpdate: 0,
    lastPriceUpdate: 0,
    isBackgroundSyncing: false,
    connectionRetries: 0
  });

  const channelRef = useRef<any>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Force real-time data refresh
  const forceDataRefresh = useCallback(async () => {
    try {
      console.log('🔄 Forcing Android data refresh...');
      
      // Trigger signal outcome updates
      await supabase.functions.invoke('verify-outcome-system', {
        body: { forceRefresh: true }
      });

      // Update price data
      await supabase.functions.invoke('update-centralized-market', {
        body: { forceUpdate: true }
      });

      setSyncState(prev => ({
        ...prev,
        lastSignalUpdate: Date.now(),
        lastPriceUpdate: Date.now()
      }));

      console.log('✅ Android data refresh completed');
      
    } catch (error) {
      console.error('❌ Android data refresh failed:', error);
    }
  }, []);

  // Enhanced real-time connection setup
  const setupRealTimeConnection = useCallback(() => {
    try {
      // Clean up existing connection
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      console.log('📱 Setting up Android real-time connection...');

      // Create comprehensive real-time channel
      const channel = supabase
        .channel('android-sync-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'trading_signals' },
          (payload) => {
            console.log('📊 Signal update received:', payload);
            setSyncState(prev => ({ 
              ...prev, 
              lastSignalUpdate: Date.now(),
              isConnected: true 
            }));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'centralized_market_state' },
          (payload) => {
            console.log('💰 Price update received:', payload);
            setSyncState(prev => ({ 
              ...prev, 
              lastPriceUpdate: Date.now(),
              isConnected: true 
            }));
          }
        )
        .on('presence', { event: 'sync' }, () => {
          setSyncState(prev => ({ 
            ...prev, 
            isConnected: true, 
            connectionRetries: 0 
          }));
        })
        .subscribe(async (status) => {
          console.log('📡 Android channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Android real-time connected');
            await channel.track({ android_user: true, timestamp: Date.now() });
            setSyncState(prev => ({ 
              ...prev, 
              isConnected: true,
              connectionRetries: 0 
            }));
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.log('❌ Android real-time connection failed:', status);
            setSyncState(prev => ({ 
              ...prev, 
              isConnected: false,
              connectionRetries: prev.connectionRetries + 1 
            }));
            
            // Retry connection after delay
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setupRealTimeConnection();
              }
            }, Math.min(5000 * (syncState.connectionRetries + 1), 30000));
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('💥 Android real-time setup failed:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isConnected: false,
        connectionRetries: prev.connectionRetries + 1 
      }));
    }
  }, [syncState.connectionRetries]);

  // Background sync for Android
  const setupBackgroundSync = useCallback(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // Setup aggressive background sync for Android
    syncIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current) return;

      setSyncState(prev => ({ ...prev, isBackgroundSyncing: true }));

      try {
        // Force refresh data every 30 seconds on Android
        await forceDataRefresh();
        
        console.log('🔄 Android background sync completed');
      } catch (error) {
        console.error('❌ Android background sync failed:', error);
      } finally {
        setSyncState(prev => ({ ...prev, isBackgroundSyncing: false }));
      }
    }, 30000); // 30 second intervals

    console.log('⏰ Android background sync started');
  }, [forceDataRefresh]);

  // Initialize Android sync
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    mountedRef.current = true;
    
    // Initial data refresh
    forceDataRefresh();
    
    // Setup real-time connection
    setupRealTimeConnection();
    
    // Setup background sync
    setupBackgroundSync();

    return () => {
      mountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [setupRealTimeConnection, setupBackgroundSync, forceDataRefresh]);

  // Handle app state changes on Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupAppStateListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        const listener = await App.addListener('appStateChange', (state) => {
          console.log('📱 Android app state changed:', state.isActive);
          
          if (state.isActive) {
            // App became active - force refresh
            forceDataRefresh();
            setupRealTimeConnection();
            
            toast({
              title: "App Refreshed",
              description: "Data synced successfully",
              duration: 2000
            });
          }
        });

        return () => listener.remove();
      } catch (error) {
        console.warn('⚠️ Android app state listener setup failed:', error);
      }
    };

    setupAppStateListener();
  }, [forceDataRefresh, setupRealTimeConnection, toast]);

  return {
    ...syncState,
    forceDataRefresh,
    retryConnection: setupRealTimeConnection
  };
};