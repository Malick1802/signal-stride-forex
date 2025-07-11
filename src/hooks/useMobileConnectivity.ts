
import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

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
      if (Capacitor.isNativePlatform()) {
        try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          
          setConnectivity(prev => ({
            ...prev,
            isOnline: status.connected,
            connectionType: status.connectionType,
            isConnected: status.connected,
            lastConnected: status.connected ? new Date() : prev.lastConnected
          }));
          
          console.log('📱 Native connectivity check:', status);
        } catch (error) {
          console.warn('❌ Network plugin not available, using navigator.onLine');
          setConnectivity(prev => ({
            ...prev,
            isOnline: navigator.onLine,
            connectionType: 'unknown',
            isConnected: navigator.onLine,
            lastConnected: navigator.onLine ? new Date() : prev.lastConnected
          }));
        }
      } else {
        // Simple web connectivity check without aggressive network requests
        const isOnline = navigator.onLine;
        setConnectivity(prev => ({
          ...prev,
          isOnline,
          connectionType: 'wifi',
          isConnected: isOnline,
          lastConnected: isOnline ? new Date() : prev.lastConnected
        }));
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
    console.log('🔄 Retrying connection...');
    setConnectivity(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
    
    // Force a fresh connectivity check
    await checkConnectivity();
    
    // Clear any cached offline state if connection is restored
    if (navigator.onLine && Capacitor.isNativePlatform()) {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        if (status.connected) {
          console.log('✅ Connection restored via retry');
          // Trigger a page refresh on mobile to clear any cached offline state
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        console.warn('Retry connection check failed:', error);
      }
    }
  }, [checkConnectivity]);

  useEffect(() => {
    checkConnectivity();

    const handleOnline = () => {
      console.log('📶 Network came online');
      checkConnectivity();
    };

    const handleOffline = () => {
      console.log('📵 Network went offline');
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
    if (Capacitor.isNativePlatform()) {
      const setupNetworkListener = async () => {
        try {
          const { Network } = await import('@capacitor/network');
          networkListener = await Network.addListener('networkStatusChange', (status: any) => {
            console.log('📱 Network status changed:', status);
            setConnectivity(prev => ({
              ...prev,
              isOnline: status.connected,
              connectionType: status.connectionType,
              isConnected: status.connected,
              lastConnected: status.connected ? new Date() : prev.lastConnected
            }));
          });
        } catch (error) {
          console.warn('❌ Network listener setup failed:', error);
        }
      };
      
      setupNetworkListener();
    }

    // Periodic connectivity check - reduced frequency for mobile
    const interval = setInterval(checkConnectivity, 2 * 60 * 1000); // 2 minutes

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
