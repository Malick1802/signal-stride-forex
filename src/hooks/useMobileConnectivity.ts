
import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Dynamically import Network to handle cases where it might not be available
let Network: any = null;
try {
  if (Capacitor.isNativePlatform()) {
    import('@capacitor/network').then(module => {
      Network = module.Network;
    });
  }
} catch (error) {
  console.warn('Network plugin not available:', error);
}

interface ConnectivityState {
  isOnline: boolean;
  connectionType: string;
  isConnected: boolean;
  lastConnected: Date | null;
  retryCount: number;
}

export const useMobileConnectivity = () => {
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    isConnected: navigator.onLine,
    lastConnected: navigator.onLine ? new Date() : null,
    retryCount: 0
  });

  const checkConnectivity = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform() && Network) {
        const status = await Network.getStatus();
        setConnectivity(prev => ({
          ...prev,
          isOnline: status.connected,
          connectionType: status.connectionType,
          isConnected: status.connected,
          lastConnected: status.connected ? new Date() : prev.lastConnected
        }));
      } else {
        // Web fallback - test actual connectivity
        try {
          const response = await fetch('/favicon.ico', { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          const isReallyOnline = response.ok;
          
          setConnectivity(prev => ({
            ...prev,
            isOnline: navigator.onLine && isReallyOnline,
            connectionType: 'wifi',
            isConnected: navigator.onLine && isReallyOnline,
            lastConnected: (navigator.onLine && isReallyOnline) ? new Date() : prev.lastConnected
          }));
        } catch (error) {
          setConnectivity(prev => ({
            ...prev,
            isOnline: false,
            isConnected: false
          }));
        }
      }
    } catch (error) {
      console.error('Error checking connectivity:', error);
      setConnectivity(prev => ({
        ...prev,
        isOnline: false,
        isConnected: false
      }));
    }
  }, []);

  const retryConnection = useCallback(async () => {
    setConnectivity(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
    
    await checkConnectivity();
  }, [checkConnectivity]);

  useEffect(() => {
    checkConnectivity();

    const handleOnline = () => {
      console.log('📶 Mobile: Network came online');
      checkConnectivity();
    };

    const handleOffline = () => {
      console.log('📵 Mobile: Network went offline');
      setConnectivity(prev => ({
        ...prev,
        isOnline: false,
        isConnected: false
      }));
    };

    // Web event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Native network listener
    let networkListener: any = null;
    if (Capacitor.isNativePlatform() && Network) {
      Network.addListener('networkStatusChange', (status: any) => {
        console.log('📱 Mobile: Network status changed:', status);
        setConnectivity(prev => ({
          ...prev,
          isOnline: status.connected,
          connectionType: status.connectionType,
          isConnected: status.connected,
          lastConnected: status.connected ? new Date() : prev.lastConnected
        }));
      }).then((listener: any) => {
        networkListener = listener;
      });
    }

    // Periodic connectivity check
    const interval = setInterval(checkConnectivity, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (networkListener) {
        networkListener.remove();
      }
      clearInterval(interval);
    };
  }, [checkConnectivity]);

  return {
    ...connectivity,
    retryConnection,
    checkConnectivity
  };
};
