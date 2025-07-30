import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackgroundSyncOptions {
  syncInterval?: number;
  enableBackgroundSync?: boolean;
  onSyncComplete?: (data: any) => void;
}

export const useMobileBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const {
    syncInterval = 30000, // 30 seconds
    enableBackgroundSync = true,
    onSyncComplete
  } = options;

  const { toast } = useToast();
  const lastSyncTimeRef = useRef<number>(Date.now());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performBackgroundSync = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Starting mobile background sync...');

      // Sync trading signals
      const { data: signals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .gte('created_at', new Date(lastSyncTimeRef.current).toISOString())
        .order('created_at', { ascending: false });

      if (signalsError) {
        console.error('❌ Signals sync failed:', signalsError);
        return;
      }

      // Sync centralized market data
      const { data: marketData, error: marketError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .order('last_update', { ascending: false })
        .limit(10);

      if (marketError) {
        console.error('❌ Market data sync failed:', marketError);
        return;
      }

      lastSyncTimeRef.current = Date.now();
      
      if (onSyncComplete) {
        onSyncComplete({ signals, marketData });
      }

      console.log('✅ Mobile background sync completed', {
        signalsCount: signals?.length || 0,
        marketDataCount: marketData?.length || 0
      });

    } catch (error) {
      console.error('💥 Background sync error:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync latest data in background",
        variant: "destructive"
      });
    }
  }, [onSyncComplete, toast]);

  const setupBackgroundTasks = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - using standard intervals');
      return;
    }

    try {
      // Use App plugin for background state handling since BackgroundTask might not be available
      const { App } = await import('@capacitor/app');
      
      console.log('✅ Background task handling setup with App plugin');
    } catch (error) {
      console.warn('⚠️ Background task setup failed:', error);
    }
  }, [performBackgroundSync]);

  const startSync = useCallback(() => {
    if (!enableBackgroundSync) return;

    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // Setup new sync interval
    syncIntervalRef.current = setInterval(performBackgroundSync, syncInterval);

    // Setup native background tasks
    setupBackgroundTasks();

    console.log('🚀 Mobile background sync started', { syncInterval });
  }, [enableBackgroundSync, syncInterval, performBackgroundSync, setupBackgroundTasks]);

  const stopSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    console.log('⏹️ Mobile background sync stopped');
  }, []);

  // Auto-start sync on mount
  useEffect(() => {
    startSync();
    return stopSync;
  }, [startSync, stopSync]);

  // Handle app state changes for native platforms
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupAppStateListeners = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        const stateChangeListener = await App.addListener('appStateChange', (state) => {
          if (state.isActive) {
            console.log('📱 App became active - triggering sync');
            performBackgroundSync();
          }
        });

        return () => stateChangeListener.remove();
      } catch (error) {
        console.warn('⚠️ App state listener setup failed:', error);
      }
    };

    setupAppStateListeners();
  }, [performBackgroundSync]);

  return {
    performBackgroundSync,
    startSync,
    stopSync,
    lastSyncTime: lastSyncTimeRef.current
  };
};