
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
    isOnline: true, // Start optimistic
    connectionType: 'unknown',
    isConnected: true,
    lastConnected: new Date(),
    retryCount: 0
  });

  const checkConnectivity = useCallback(async () => {
    try {
      console.log('🔍 Checking connectivity...');
      
      if (Capacitor.isNativePlatform()) {
        try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          
          console.log('📱 Native network status:', status);
          
          // Be more lenient - consider "cellular" and "wifi" as connected
          const isConnected = status.connected && 
                             (status.connectionType === 'wifi' || 
                              status.connectionType === 'cellular' ||
                              status.connectionType === 'none' ? false : true);
          
          setConnectivity(prev => ({
            ...prev,
            isOnline: isConnected,
            connectionType: status.connectionType,
            isConnected: isConnected,
            lastConnected: isConnected ? new Date() : prev.lastConnected
          }));
        } catch (error) {
          console.warn('❌ Network plugin not available, falling back to navigator.onLine');
          // Fallback to browser API with optimistic approach
          const isOnline = navigator.onLine;
          setConnectivity(prev => ({
            ...prev,
            isOnline: isOnline,
            connectionType: 'fallback',
            isConnected: isOnline,
            lastConnected: isOnline ? new Date() : prev.lastConnected
          }));
        }
      } else {
        // Web platform - use navigator.onLine but be optimistic
        const isOnline = navigator.onLine;
        console.log('🌐 Web connectivity:', isOnline);
        
        setConnectivity(prev => ({
          ...prev,
          isOnline: isOnline,
          connectionType: 'web',
          isConnected: isOnline,
          lastConnected: isOnline ? new Date() : prev.lastConnected
        }));
      }
    } catch (error) {
      console.error('❌ Connectivity check failed:', error);
      // Don't immediately mark as offline on errors - be more tolerant
      setConnectivity(prev => ({
        ...prev,
        connectionType: 'error'
      }));
    }
  }, []);

  const retryConnection = useCallback(async () => {
    console.log('🔄 Retrying connection...');
    setConnectivity(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
    
    try {
      // Force a fresh connectivity check
      await checkConnectivity();
      console.log('✅ Connection retry completed');
    } catch (error) {
      console.error('❌ Connection retry failed:', error);
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

    // Periodic connectivity check - less frequent for better battery life
    const interval = setInterval(checkConnectivity, 5 * 60 * 1000); // 5 minutes

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
