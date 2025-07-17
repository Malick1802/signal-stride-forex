import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionState {
  isOnline: boolean;
  isSupabaseConnected: boolean;
  connectionType: string;
  lastConnected: Date | null;
  retryCount: number;
}

export const useProductionConnection = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: false,
    isSupabaseConnected: false,
    connectionType: 'unknown',
    lastConnected: null,
    retryCount: 0
  });

  const [isRetrying, setIsRetrying] = useState(false);

  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      return false;
    }
  }, []);

  const checkNetworkStatus = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        return {
          isOnline: status.connected,
          connectionType: status.connectionType
        };
      } else {
        return {
          isOnline: navigator.onLine,
          connectionType: 'web'
        };
      }
    } catch (error) {
      console.error('Network status check failed:', error);
      return {
        isOnline: false,
        connectionType: 'unknown'
      };
    }
  }, []);

  const performConnectionCheck = useCallback(async () => {
    const networkStatus = await checkNetworkStatus();
    const isSupabaseConnected = networkStatus.isOnline ? await checkSupabaseConnection() : false;

    setConnectionState(prev => ({
      ...prev,
      isOnline: networkStatus.isOnline,
      isSupabaseConnected,
      connectionType: networkStatus.connectionType,
      lastConnected: isSupabaseConnected ? new Date() : prev.lastConnected
    }));

    return { ...networkStatus, isSupabaseConnected };
  }, [checkNetworkStatus, checkSupabaseConnection]);

  const retryConnection = useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setConnectionState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));

    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await performConnectionCheck();
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, performConnectionCheck]);

  const resetRetryCount = useCallback(() => {
    setConnectionState(prev => ({ ...prev, retryCount: 0 }));
  }, []);

  useEffect(() => {
    // Initial connection check
    performConnectionCheck();

    // Set up network status monitoring
    let networkListener: any;
    
    if (Capacitor.isNativePlatform()) {
      networkListener = Network.addListener('networkStatusChange', (status) => {
        console.log('📡 Network status changed:', status);
        performConnectionCheck();
      });
    } else {
      const handleOnline = () => performConnectionCheck();
      const handleOffline = () => performConnectionCheck();
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      networkListener = {
        remove: () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        }
      };
    }

    // Periodic connection health check
    const healthCheckInterval = setInterval(() => {
      if (connectionState.isOnline) {
        performConnectionCheck();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
      clearInterval(healthCheckInterval);
    };
  }, [performConnectionCheck, connectionState.isOnline]);

  return {
    ...connectionState,
    isRetrying,
    retryConnection,
    resetRetryCount,
    performConnectionCheck
  };
};