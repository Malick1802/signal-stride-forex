import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface MobileAppState {
  isActive: boolean;
  isVisible: boolean;
  lastActiveTime: number;
  inactivityDuration: number;
  backgroundCount: number;
  needsStateRecovery: boolean;
}

interface LifecycleOptions {
  onAppResume?: () => void;
  onAppPause?: () => void;
  onAppRestore?: () => void;
  onLongInactivity?: (duration: number) => void;
  inactivityThreshold?: number;
}

export const useMobileAppLifecycle = (options: LifecycleOptions = {}) => {
  const {
    onAppResume,
    onAppPause,
    onAppRestore,
    onLongInactivity,
    inactivityThreshold = 5 * 60 * 1000 // 5 minutes
  } = options;

  const [appState, setAppState] = useState<MobileAppState>({
    isActive: !document.hidden,
    isVisible: !document.hidden,
    lastActiveTime: Date.now(),
    inactivityDuration: 0,
    backgroundCount: 0,
    needsStateRecovery: false
  });

  const pauseTimeRef = useRef<number | null>(null);
  const lifecycleListenersRef = useRef<(() => void)[]>([]);

  // Preserve app state in localStorage
  const saveAppState = useCallback((state: Partial<MobileAppState>) => {
    try {
      const stateToSave = { ...appState, ...state };
      localStorage.setItem('mobile_app_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save app state:', error);
    }
  }, [appState]);

  // Restore app state from localStorage
  const restoreAppState = useCallback(() => {
    try {
      const saved = localStorage.getItem('mobile_app_state');
      if (saved) {
        const savedState = JSON.parse(saved);
        setAppState(prev => ({
          ...prev,
          ...savedState,
          isActive: !document.hidden,
          isVisible: !document.hidden,
          needsStateRecovery: true
        }));
        return true;
      }
    } catch (error) {
      console.warn('Failed to restore app state:', error);
    }
    return false;
  }, []);

  // Handle app pause (going to background)
  const handleAppPause = useCallback(() => {
    console.log('📱 App pausing - saving state');
    pauseTimeRef.current = Date.now();
    
    const newState = {
      isActive: false,
      lastActiveTime: Date.now(),
      backgroundCount: appState.backgroundCount + 1
    };
    
    setAppState(prev => ({ ...prev, ...newState }));
    saveAppState(newState);
    onAppPause?.();
  }, [appState.backgroundCount, saveAppState, onAppPause]);

  // Handle app resume (coming from background)
  const handleAppResume = useCallback(() => {
    const now = Date.now();
    const inactivityDuration = pauseTimeRef.current ? now - pauseTimeRef.current : 0;
    
    console.log(`📱 App resuming after ${Math.round(inactivityDuration / 1000)}s inactivity`);
    
    const newState = {
      isActive: true,
      isVisible: !document.hidden,
      lastActiveTime: now,
      inactivityDuration,
      needsStateRecovery: inactivityDuration > inactivityThreshold
    };
    
    setAppState(prev => ({ ...prev, ...newState }));
    saveAppState(newState);
    
    // Handle long inactivity
    if (inactivityDuration > inactivityThreshold) {
      console.log(`📱 Long inactivity detected: ${Math.round(inactivityDuration / 1000)}s`);
      onLongInactivity?.(inactivityDuration);
      onAppRestore?.();
    } else {
      onAppResume?.();
    }
    
    pauseTimeRef.current = null;
  }, [inactivityThreshold, saveAppState, onAppResume, onAppRestore, onLongInactivity]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    console.log(`📱 Visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
    
    setAppState(prev => ({ ...prev, isVisible }));
    
    if (isVisible) {
      handleAppResume();
    } else {
      handleAppPause();
    }
  }, [handleAppResume, handleAppPause]);

  // Handle page focus/blur
  const handleFocus = useCallback(() => {
    console.log('📱 App focused');
    handleAppResume();
  }, [handleAppResume]);

  const handleBlur = useCallback(() => {
    console.log('📱 App blurred');
    handleAppPause();
  }, [handleAppPause]);

  // Clear state recovery flag
  const clearStateRecovery = useCallback(() => {
    setAppState(prev => ({ ...prev, needsStateRecovery: false }));
  }, []);

  // Force app state refresh
  const refreshAppState = useCallback(() => {
    const now = Date.now();
    setAppState(prev => ({
      ...prev,
      isActive: !document.hidden,
      isVisible: !document.hidden,
      lastActiveTime: now,
      needsStateRecovery: false
    }));
  }, []);

  useEffect(() => {
    // Restore state on mount
    restoreAppState();

    // Set up web event listeners
    const cleanupFns: (() => void)[] = [];

    // Document visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);
    cleanupFns.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));

    // Window focus/blur
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    cleanupFns.push(() => window.removeEventListener('focus', handleFocus));
    cleanupFns.push(() => window.removeEventListener('blur', handleBlur));

    // Page unload - save state
    const handleBeforeUnload = () => {
      handleAppPause();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    cleanupFns.push(() => window.removeEventListener('beforeunload', handleBeforeUnload));

    // Native app listeners for Capacitor
    if (Capacitor.isNativePlatform()) {
      const setupNativeListeners = async () => {
        try {
          const { App } = await import('@capacitor/app');
          
          const appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
            console.log(`📱 Native app state: ${isActive ? 'active' : 'inactive'}`);
            if (isActive) {
              handleAppResume();
            } else {
              handleAppPause();
            }
          });

          const resumeListener = await App.addListener('resume', () => {
            console.log('📱 Native app resumed');
            handleAppResume();
          });

          const pauseListener = await App.addListener('pause', () => {
            console.log('📱 Native app paused');
            handleAppPause();
          });

          cleanupFns.push(() => {
            appStateListener.remove();
            resumeListener.remove();
            pauseListener.remove();
          });
        } catch (error) {
          console.warn('📱 Native app listeners not available:', error);
        }
      };

      setupNativeListeners();
    }

    lifecycleListenersRef.current = cleanupFns;

    return () => {
      cleanupFns.forEach(cleanup => cleanup());
    };
  }, [handleVisibilityChange, handleFocus, handleBlur, handleAppPause, handleAppResume, restoreAppState]);

  return {
    appState,
    clearStateRecovery,
    refreshAppState,
    isLongInactivity: appState.inactivityDuration > inactivityThreshold,
    needsRecovery: appState.needsStateRecovery
  };
};