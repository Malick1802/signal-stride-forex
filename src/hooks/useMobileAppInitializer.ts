import { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileConnectivity } from './useMobileConnectivity';
import { useMobileNotificationDebugger } from './useMobileNotificationDebugger';
import { useBackgroundSync } from './useBackgroundSync';
import { useNativeFeatures } from './useNativeFeatures';

interface MobileAppState {
  isInitialized: boolean;
  isReady: boolean;
  initializationStep: string;
  hasError: boolean;
  errorMessage: string | null;
}

export const useMobileAppInitializer = () => {
  const { user } = useAuth();
  const { isConnected } = useMobileConnectivity();
  const { runFullDiagnostic } = useMobileNotificationDebugger();
  const { performBackgroundSync } = useBackgroundSync();
  const { triggerHaptic } = useNativeFeatures();

  const [appState, setAppState] = useState<MobileAppState>({
    isInitialized: false,
    isReady: false,
    initializationStep: 'Starting...',
    hasError: false,
    errorMessage: null
  });

  const setInitStep = useCallback((step: string) => {
    console.log(`📱 Mobile Init: ${step}`);
    setAppState(prev => ({
      ...prev,
      initializationStep: step
    }));
  }, []);

  const setError = useCallback((error: string) => {
    console.error(`❌ Mobile Init Error: ${error}`);
    setAppState(prev => ({
      ...prev,
      hasError: true,
      errorMessage: error
    }));
  }, []);

  const initializeNativeFeatures = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setInitStep('Web platform - native features skipped');
      return;
    }

    try {
      setInitStep('Configuring status bar...');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1a1a1a' });

      setInitStep('Setting up keyboard handlers...');
      await Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });

      await Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });

      setInitStep('Configuring network monitoring...');
      await Network.addListener('networkStatusChange', (status) => {
        console.log('📶 Network status changed:', status);
      });

      setInitStep('Setting up app lifecycle handlers...');
      await App.addListener('appStateChange', ({ isActive }) => {
        console.log('📱 App state changed:', isActive);
        if (isActive && user && isConnected) {
          performBackgroundSync();
        }
      });

      setInitStep('Native features configured');
    } catch (error) {
      console.error('❌ Native features setup failed:', error);
      setError(`Native setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user, isConnected, performBackgroundSync, setInitStep, setError]);

  const initializeNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user) {
      setInitStep('Notifications skipped - web platform or no user');
      return;
    }

    try {
      setInitStep('Setting up notifications...');
      await runFullDiagnostic();
      setInitStep('Notifications configured');
    } catch (error) {
      console.error('❌ Notification setup failed:', error);
      setError(`Notification setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user, runFullDiagnostic, setInitStep, setError]);

  const hideSplashScreen = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      setInitStep('Hiding splash screen...');
      await SplashScreen.hide();
      await triggerHaptic('Light');
      setInitStep('Initialization complete');
    } catch (error) {
      console.error('❌ Splash screen hide failed:', error);
      // Don't set this as a critical error
    }
  }, [triggerHaptic, setInitStep]);

  const performFullInitialization = useCallback(async () => {
    try {
      setAppState(prev => ({ ...prev, hasError: false, errorMessage: null }));
      
      setInitStep('Initializing mobile app...');
      
      // Initialize native features
      await initializeNativeFeatures();
      
      // Initialize notifications if user is logged in
      if (user) {
        await initializeNotifications();
      }
      
      // Hide splash screen
      await hideSplashScreen();
      
      setAppState(prev => ({
        ...prev,
        isInitialized: true,
        isReady: true,
        initializationStep: 'Ready'
      }));
      
      console.log('✅ Mobile app initialization complete');
    } catch (error) {
      console.error('❌ Mobile app initialization failed:', error);
      setError(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user, initializeNativeFeatures, initializeNotifications, hideSplashScreen, setInitStep, setError]);

  // Initialize on mount and when user changes
  useEffect(() => {
    if (!appState.isInitialized) {
      performFullInitialization();
    }
  }, [appState.isInitialized, performFullInitialization]);

  // Re-initialize notifications when user logs in
  useEffect(() => {
    if (user && appState.isInitialized && Capacitor.isNativePlatform()) {
      console.log('🔄 User logged in - reinitializing notifications');
      initializeNotifications();
    }
  }, [user, appState.isInitialized, initializeNotifications]);

  const retryInitialization = useCallback(() => {
    setAppState({
      isInitialized: false,
      isReady: false,
      initializationStep: 'Retrying...',
      hasError: false,
      errorMessage: null
    });
  }, []);

  return {
    ...appState,
    retryInitialization,
    isNativePlatform: Capacitor.isNativePlatform()
  };
};