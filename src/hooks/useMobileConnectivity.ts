
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface ConnectivityState {
  isOnline: boolean;
  connectionType: string;
  isConnected: boolean;
  lastConnected: Date | null;
  retryCount: number;
  isRestoring: boolean;
}

export const useMobileConnectivity = () => {
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    isConnected: navigator.onLine,
    lastConnected: navigator.onLine ? new Date() : null,
    retryCount: 0,
    isRestoring: false
  });
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkConnectivity = useCallback(async (isRestoringConnection = false) => {
    try {
      if (isRestoringConnection) {
        setConnectivity(prev => ({ ...prev, isRestoring: true }));
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          
          const updateState = {
            isOnline: status.connected,
            connectionType: status.connectionType,
            isConnected: status.connected,
            lastConnected: status.connected ? new Date() : connectivity.lastConnected,
            isRestoring: false
          };
          
          setConnectivity(prev => ({ ...prev, ...updateState }));
          
        } catch (error) {
          console.warn('❌ Network plugin not available:', error);
          // Fall back to web connectivity check
          const updateState = {
            isOnline: navigator.onLine,
            connectionType: 'wifi',
            isConnected: navigator.onLine,
            lastConnected: navigator.onLine ? new Date() : connectivity.lastConnected,
            isRestoring: false
          };
          
          setConnectivity(prev => ({ ...prev, ...updateState }));
        }
      } else {
        // Web connectivity check with debouncing
        try {
          const response = await fetch('/favicon.ico', { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          const isReallyOnline = response.ok;
          
          const updateState = {
            isOnline: navigator.onLine && isReallyOnline,
            connectionType: 'wifi',
            isConnected: navigator.onLine && isReallyOnline,
            lastConnected: (navigator.onLine && isReallyOnline) ? new Date() : connectivity.lastConnected,
            isRestoring: false
          };
          
          setConnectivity(prev => ({ ...prev, ...updateState }));
          
        } catch (error) {
          setConnectivity(prev => ({
            ...prev,
            isOnline: false,
            isConnected: false,
            isRestoring: false
          }));
        }
      }
    } catch (error) {
      console.error('Error checking connectivity:', error);
      setConnectivity(prev => ({
        ...prev,
        isOnline: false,
        isConnected: false,
        isRestoring: false
      }));
    }
  }, [connectivity.lastConnected]);

  const retryConnection = useCallback(async () => {
    console.log('🔄 Manually retrying connection...');
    setConnectivity(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
    
    await checkConnectivity(true);
  }, [checkConnectivity]);

  useEffect(() => {
    // Initial check with a slight delay to let everything stabilize
    setTimeout(() => checkConnectivity(), 500);

    const handleOnline = () => {
      console.log('📶 Network came online');
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      setConnectivity(prev => ({ ...prev, isRestoring: true }));
      debounceTimeoutRef.current = setTimeout(() => {
        checkConnectivity(true);
      }, 1000); // 1 second debounce for online
    };

    const handleOffline = () => {
      console.log('📵 Network went offline');
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Debounce offline transitions to prevent flashing
      debounceTimeoutRef.current = setTimeout(() => {
        setConnectivity(prev => ({
          ...prev,
          isOnline: false,
          isConnected: false,
          isRestoring: false
        }));
      }, 2000); // 2 second debounce for offline
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

          // Enhanced network status listener with debouncing
          networkListener = await Network.addListener('networkStatusChange', (status: any) => {
            console.log('📱 Network status changed:', status);
            
            // Clear any pending debounce
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            
            if (status.connected) {
              setConnectivity(prev => ({ ...prev, isRestoring: true }));
              debounceTimeoutRef.current = setTimeout(() => {
                setConnectivity(prev => ({
                  ...prev,
                  isOnline: status.connected,
                  connectionType: status.connectionType,
                  isConnected: status.connected,
                  lastConnected: new Date(),
                  isRestoring: false
                }));
              }, 1000);
            } else {
              debounceTimeoutRef.current = setTimeout(() => {
                setConnectivity(prev => ({
                  ...prev,
                  isOnline: false,
                  isConnected: false,
                  isRestoring: false
                }));
              }, 2000);
            }
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
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
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
