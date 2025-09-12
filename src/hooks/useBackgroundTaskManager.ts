import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, AppState } from '@capacitor/app';

export interface BackgroundTaskManagerOptions {
  onAppStateChange?: (state: AppState) => void;
  enableWakeLock?: boolean;
  backgroundSyncInterval?: number;
}

export const useBackgroundTaskManager = (options: BackgroundTaskManagerOptions = {}) => {
  const backgroundTaskId = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const batteryExemptionRequested = useRef<boolean>(false);
  const {
    onAppStateChange,
    enableWakeLock = true,
    backgroundSyncInterval = 30000
  } = options;

  const startBackgroundTask = useCallback(async (taskFunction: () => Promise<void>) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      console.log('🔄 Starting background task simulation');
      // For now, just execute the task - would need custom plugin for true background execution
      await taskFunction();
      console.log('✅ Background task completed');
    } catch (error) {
      console.error('❌ Failed to execute background task:', error);
    }
  }, []);

  const requestBatteryOptimizationExemption = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    if (batteryExemptionRequested.current) return;

    try {
      batteryExemptionRequested.current = true;
      
      // Show user guidance for manual battery optimization setup
      console.log('📱 Prompting user for battery optimization exemption');
      
      // In a real implementation, this would:
      // 1. Check if battery optimization is disabled
      // 2. Show native dialog or guide user to settings
      // 3. Open device settings automatically if possible
      
      // For now, we'll trigger the enhanced battery guide
      console.log('🔋 User should be guided through battery optimization setup');
      
    } catch (error) {
      console.warn('⚠️ Could not request battery optimization exemption:', error);
      batteryExemptionRequested.current = false;
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (!enableWakeLock || !('wakeLock' in navigator)) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      console.log('🔒 Wake lock acquired');
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('🔓 Wake lock released');
        wakeLockRef.current = null;
      });
    } catch (error) {
      console.warn('⚠️ Failed to acquire wake lock:', error);
    }
  }, [enableWakeLock]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = (state: AppState) => {
      console.log(`📱 App state changed: ${state.isActive ? 'active' : 'background'}`);
      
      if (state.isActive) {
        // App became active - release wake lock if held
        releaseWakeLock();
      } else {
        // App went to background - acquire wake lock for notifications
        if (enableWakeLock) {
          acquireWakeLock();
        }
      }
      
      onAppStateChange?.(state);
    };

    // Listen for app state changes
    const stateListener = App.addListener('appStateChange', handleAppStateChange);

    // Request battery optimization exemption on init (delayed to avoid blocking startup)
    setTimeout(requestBatteryOptimizationExemption, 5000);

    return () => {
      stateListener.then(listener => listener.remove());
      releaseWakeLock();
    };
  }, [onAppStateChange, enableWakeLock, acquireWakeLock, releaseWakeLock, requestBatteryOptimizationExemption]);

  return {
    startBackgroundTask,
    requestBatteryOptimizationExemption,
    acquireWakeLock,
    releaseWakeLock
  };
};