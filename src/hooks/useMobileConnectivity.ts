
import React, { useState, useEffect, useCallback } from 'react';
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

    // Enhanced native listeners with app state handling
    let networkListener: any = null;
    let appStateListener: any = null;
    
    if (Capacitor.isNativePlatform()) {
      const setupNativeListeners = async () => {
        try {
          const { Network } = await import('@capacitor/network');
          const { App } = await import('@capacitor/app');

          // Enhanced network status listener
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

          // App state listener for resume handling
          appStateListener = await App.addListener('appStateChange', ({ isActive }: any) => {
            if (isActive) {
              console.log('📱 App resumed - checking connectivity');
              // Delay connectivity check to allow network to stabilize
              setTimeout(checkConnectivity, 1000);
            }
          });

        } catch (error) {
          console.warn('❌ Native listener setup failed:', error);
        }
      };
      
      setupNativeListeners();
    }

    // Enhanced periodic check with dynamic intervals
    const interval = setInterval(() => {
      checkConnectivity();
      // More frequent checks when disconnected
      if (!connectivity.isConnected && connectivity.retryCount < 5) {
        setTimeout(checkConnectivity, 5000);
      }
    }, connectivity.isConnected ? 30000 : 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (networkListener) {
        networkListener.remove();
      }
      if (appStateListener) {
        appStateListener.remove();
      }
      clearInterval(interval);
    };
  }, [checkConnectivity, connectivity.isConnected, connectivity.retryCount]);

  return {
    ...connectivity,
    retryConnection,
    checkConnectivity
  };
};
