
import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import reactRecovery from '../utils/reactRecovery';

interface ConnectivityState {
  isOnline: boolean;
  connectionType: string;
  isConnected: boolean;
  lastConnected: Date | null;
  retryCount: number;
}

// Create a completely independent state management system for when React is compromised
class FallbackStateManager {
  private state: ConnectivityState;
  private listeners: Set<(state: ConnectivityState) => void> = new Set();

  constructor(initialState: ConnectivityState) {
    this.state = initialState;
  }

  getState(): ConnectivityState {
    return { ...this.state };
  }

  setState(updater: Partial<ConnectivityState> | ((prev: ConnectivityState) => ConnectivityState)): void {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.warn('Listener error:', error);
      }
    });
  }

  subscribe(listener: (state: ConnectivityState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// Global fallback state manager
let fallbackManager: FallbackStateManager | null = null;

// Bulletproof React hook implementation with multiple fallback strategies
const safeUseState = <T>(initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  try {
    // Strategy 1: Try window.React first
    if (typeof window !== 'undefined' && window.React && window.React.useState) {
      return window.React.useState(initialState);
    }
    
    // Strategy 2: Try direct import
    const { useState } = require('react');
    if (useState) {
      return useState(initialState);
    }
    
    throw new Error('All React strategies failed');
  } catch (error) {
    console.warn('🚨 React hooks compromised, using bulletproof fallback:', error);
    
    // Bulletproof fallback using closure-based state
    let currentValue = initialState;
    let rerenderTrigger = 0;
    
    const setValue = (newValue: T | ((prev: T) => T)) => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(currentValue)
        : newValue;
      
      if (currentValue !== nextValue) {
        currentValue = nextValue;
        rerenderTrigger++;
        
        // Try multiple re-render strategies
        try {
          // Strategy 1: Custom event
          if (typeof window !== 'undefined' && document.body) {
            document.body.dispatchEvent(new CustomEvent('force-rerender', { 
              detail: { value: nextValue, trigger: rerenderTrigger } 
            }));
          }
          
          // Strategy 2: Update a hidden DOM element to trigger observers
          const hiddenElement = document.getElementById('react-fallback-trigger');
          if (hiddenElement) {
            hiddenElement.setAttribute('data-value', String(rerenderTrigger));
          } else if (document.body) {
            const trigger = document.createElement('div');
            trigger.id = 'react-fallback-trigger';
            trigger.style.display = 'none';
            trigger.setAttribute('data-value', String(rerenderTrigger));
            document.body.appendChild(trigger);
          }
        } catch (triggerError) {
          console.warn('Re-render trigger failed:', triggerError);
        }
      }
    };
    
    return [currentValue, setValue as React.Dispatch<React.SetStateAction<T>>];
  }
};

// Safe useEffect alternative
const safeUseEffect = (effect: () => void | (() => void), deps?: React.DependencyList) => {
  try {
    if (useEffect) {
      return useEffect(effect, deps);
    }
  } catch (error) {
    console.warn('useEffect compromised, running effect immediately:', error);
    // Run effect immediately as fallback
    try {
      const cleanup = effect();
      // Store cleanup for later if needed
      if (cleanup && typeof cleanup === 'function') {
        window.addEventListener('beforeunload', cleanup);
      }
    } catch (effectError) {
      console.error('Effect execution failed:', effectError);
    }
  }
};

export const useMobileConnectivity = () => {
  // Use React recovery system for maximum reliability
  const [connectivity, setConnectivity] = reactRecovery.wrapHook(
    safeUseState<ConnectivityState>,
    'useState'
  )({
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

  safeUseEffect(() => {
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
