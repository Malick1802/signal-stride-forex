import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface ConnectionState {
  isOnline: boolean;
  isSupabaseConnected: boolean;
  connectionType: string;
  lastConnected: string;
  retryCount: number;
  isRetrying: boolean;
}

interface ConnectionManager {
  connectionState: ConnectionState;
  retryConnection: () => Promise<void>;
  performConnectionCheck: () => Promise<void>;
}

// Singleton connection manager
let connectionManagerInstance: ConnectionManager | null = null;

export const useConnectionManager = (): ConnectionManager => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: navigator?.onLine ?? true,
    isSupabaseConnected: false,
    connectionType: 'unknown',
    lastConnected: '',
    retryCount: 0,
    isRetrying: false,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const healthCheckRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

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
    if (Capacitor.isNativePlatform()) {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        return {
          connected: status.connected,
          connectionType: status.connectionType
        };
      } catch (error) {
        console.error('Network status check failed:', error);
        return { connected: navigator?.onLine ?? true, connectionType: 'unknown' };
      }
    }
    return { connected: navigator?.onLine ?? true, connectionType: 'wifi' };
  }, []);

  const performConnectionCheck = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const networkStatus = await checkNetworkStatus();
      const isSupabaseConnected = networkStatus.connected ? await checkSupabaseConnection() : false;

      if (!mountedRef.current) return;

      setConnectionState(prev => ({
        ...prev,
        isOnline: networkStatus.connected,
        isSupabaseConnected,
        connectionType: networkStatus.connectionType,
        lastConnected: isSupabaseConnected ? new Date().toISOString() : prev.lastConnected,
        retryCount: isSupabaseConnected ? 0 : prev.retryCount,
      }));
    } catch (error) {
      console.error('Connection check failed:', error);
      if (mountedRef.current) {
        setConnectionState(prev => ({
          ...prev,
          isOnline: false,
          isSupabaseConnected: false,
          retryCount: prev.retryCount + 1,
        }));
      }
    }
  }, [checkNetworkStatus, checkSupabaseConnection]);

  const retryConnection = useCallback(async () => {
    if (!mountedRef.current || connectionState.isRetrying) return;

    setConnectionState(prev => ({ ...prev, isRetrying: true }));

    // Clear existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, connectionState.retryCount), 30000);
    
    retryTimeoutRef.current = setTimeout(async () => {
      if (mountedRef.current) {
        await performConnectionCheck();
        setConnectionState(prev => ({ ...prev, isRetrying: false }));
      }
    }, delay);
  }, [connectionState.retryCount, connectionState.isRetrying, performConnectionCheck]);

  // Setup network listeners and health checks
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial connection check
    performConnectionCheck();

    // Setup network listeners
    const setupNetworkListeners = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Network } = await import('@capacitor/network');
          const networkListener = await Network.addListener('networkStatusChange', (status) => {
            if (mountedRef.current) {
              setConnectionState(prev => ({
                ...prev,
                isOnline: status.connected,
                connectionType: status.connectionType
              }));
              
              if (status.connected) {
                // Check Supabase connection when network comes back
                setTimeout(performConnectionCheck, 1000);
              }
            }
          });
          return () => networkListener.remove();
        } catch (error) {
          console.warn('Network listener setup failed:', error);
          return () => {}; // Return empty cleanup function
        }
      } else {
        // Web platform listeners
        const handleOnline = () => {
          if (mountedRef.current) {
            setTimeout(performConnectionCheck, 500);
          }
        };
        
        const handleOffline = () => {
          if (mountedRef.current) {
            setConnectionState(prev => ({
              ...prev,
              isOnline: false,
              isSupabaseConnected: false
            }));
          }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    };

    let networkCleanup: (() => void) | null = null;
    setupNetworkListeners().then(cleanup => {
      if (mountedRef.current) {
        networkCleanup = cleanup;
      }
    });

    // Health check every 60 seconds (reduced polling frequency)
    healthCheckRef.current = setInterval(() => {
      if (mountedRef.current && connectionState.isOnline && !connectionState.isSupabaseConnected) {
        performConnectionCheck();
      }
    }, 60000);

    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
      }
      if (networkCleanup) {
        networkCleanup();
      }
    };
  }, []);

  // Auto-retry on connection failure
  useEffect(() => {
    if (!connectionState.isSupabaseConnected && connectionState.isOnline && !connectionState.isRetrying) {
      retryConnection();
    }
  }, [connectionState.isSupabaseConnected, connectionState.isOnline, connectionState.isRetrying, retryConnection]);

  // Create singleton instance
  if (!connectionManagerInstance) {
    connectionManagerInstance = {
      connectionState,
      retryConnection,
      performConnectionCheck
    };
  } else {
    // Update the existing instance
    connectionManagerInstance.connectionState = connectionState;
    connectionManagerInstance.retryConnection = retryConnection;
    connectionManagerInstance.performConnectionCheck = performConnectionCheck;
  }

  return connectionManagerInstance;
};