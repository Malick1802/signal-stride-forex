
import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface ConnectivityState {
  isOnline: boolean;
  connectionType: string;
  isConnected: boolean;
  lastConnected: Date | null;
  retryCount: number;
}

// Defensive React hook wrapper to handle extension interference
const safeUseState = <T>(initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  try {
    if (!useState) {
      console.error('🚨 useState is null - browser extension interference detected');
      // Fallback to a basic state management
      let state = initialState;
      const setState = (newState: T | ((prevState: T) => T)) => {
        if (typeof newState === 'function') {
          state = (newState as (prevState: T) => T)(state);
        } else {
          state = newState;
        }
      };
      return [state, setState];
    }
    return useState(initialState);
  } catch (error) {
    console.error('🚨 useState failed:', error);
    // Emergency fallback
    let state = initialState;
    const setState = () => {};
    return [state, setState];
  }
};

export const useMobileConnectivity = () => {
  const [connectivity, setConnectivity] = safeUseState<ConnectivityState>({
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
        } catch (error) {
          console.warn('❌ Network plugin not available:', error);
          // Fall back to web connectivity check
          setConnectivity(prev => ({
            ...prev,
            isOnline: navigator.onLine,
            connectionType: 'wifi',
            isConnected: navigator.onLine,
            lastConnected: navigator.onLine ? new Date() : prev.lastConnected
          }));
        }
      } else {
        // Web connectivity check
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

    // Periodic connectivity check
    const interval = setInterval(checkConnectivity, 30000);

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
