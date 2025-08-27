import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AndroidRealTimeSyncOptions {
  onStatusUpdate?: (status: string) => void;
  aggressiveMode?: boolean;
}

export const useAndroidRealTimeSync = (options: AndroidRealTimeSyncOptions = {}) => {
  const { onStatusUpdate, aggressiveMode = true } = options;
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const isConnectedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  // Force refresh all signal-related queries
  const forceRefreshSignals = useCallback(async () => {
    try {
      onStatusUpdate?.('🔄 Force refreshing signals...');
      
      // Invalidate all signal queries
      await queryClient.invalidateQueries({ queryKey: ['signals'] });
      await queryClient.invalidateQueries({ queryKey: ['expired-signals'] });
      await queryClient.invalidateQueries({ queryKey: ['market-data'] });
      
      // Refetch critical data
      await queryClient.refetchQueries({ queryKey: ['signals'], type: 'active' });
      
      onStatusUpdate?.('✅ Signals refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh signals:', error);
      onStatusUpdate?.(`❌ Refresh failed: ${error}`);
    }
  }, [queryClient, onStatusUpdate]);

  // Aggressive reconnection logic
  const setupRealtimeConnection = useCallback(async () => {
    try {
      const platform = Capacitor.getPlatform();
      console.log('📱 Platform detected:', platform);
      
      if (!Capacitor.isNativePlatform() && platform === 'web') {
        onStatusUpdate?.('🌐 Web platform detected - using fallback sync');
        // For web/debugging, still setup periodic refresh
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
        
        syncIntervalRef.current = setInterval(() => {
          console.log('🌐 Web: Periodic sync');
          forceRefreshSignals();
        }, 30000);
        return;
      }

      onStatusUpdate?.('🔗 Setting up Android real-time connection...');

      // Clear any existing timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Setup realtime subscription for signals
      const signalsChannel = supabase
        .channel('android-signals-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trading_signals'
          },
          (payload) => {
            console.log('📱 Android: Signal update received:', payload);
            forceRefreshSignals();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'centralized_market_data'
          },
          (payload) => {
            console.log('📱 Android: Market data update received:', payload);
            queryClient.invalidateQueries({ queryKey: ['market-data'] });
          }
        )
        .subscribe((status) => {
          console.log('📱 Android realtime status:', status);
          
          if (status === 'SUBSCRIBED') {
            isConnectedRef.current = true;
            reconnectAttemptsRef.current = 0;
            onStatusUpdate?.('✅ Real-time connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            isConnectedRef.current = false;
            onStatusUpdate?.('❌ Real-time connection failed');
            
            // Aggressive reconnection
            if (aggressiveMode && reconnectAttemptsRef.current < 10) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttemptsRef.current++;
                onStatusUpdate?.(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
                setupRealtimeConnection();
              }, delay);
            }
          }
        });

      // Setup periodic sync (every 30 seconds)
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      syncIntervalRef.current = setInterval(() => {
        if (Capacitor.isNativePlatform()) {
          console.log('📱 Android: Periodic sync');
          forceRefreshSignals();
        }
      }, 30000);

      return signalsChannel;
    } catch (error) {
      console.error('❌ Android realtime setup failed:', error);
      onStatusUpdate?.(`❌ Connection setup failed: ${error}`);
      
      // Retry connection
      if (aggressiveMode) {
        reconnectTimeoutRef.current = setTimeout(setupRealtimeConnection, 5000);
      }
    }
  }, [forceRefreshSignals, onStatusUpdate, aggressiveMode, queryClient]);

  // Handle app state changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        App.addListener('appStateChange', ({ isActive }) => {
          console.log('📱 Android: App state changed:', isActive);
          
          if (isActive) {
            onStatusUpdate?.('📱 App resumed - refreshing data...');
            // Force refresh when app becomes active
            setTimeout(forceRefreshSignals, 1000);
            
            // Restart realtime connection
            if (!isConnectedRef.current) {
              setupRealtimeConnection();
            }
          }
        });
      } catch (error) {
        console.warn('❌ App state listener setup failed:', error);
      }
    };

    handleAppStateChange();
  }, [forceRefreshSignals, setupRealtimeConnection, onStatusUpdate]);

  // Initialize connection
  useEffect(() => {
    console.log('📱 Android: Initializing real-time sync...');
    
    // Initial data refresh
    forceRefreshSignals();
    
    // Setup realtime connection
    const channel = setupRealtimeConnection();
    
    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      channel?.then(ch => ch?.unsubscribe());
    };
  }, [setupRealtimeConnection, forceRefreshSignals]);

  return {
    forceRefreshSignals,
    isConnected: isConnectedRef.current,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};