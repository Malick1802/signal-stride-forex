
import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const useNativeFeatures = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializeNativeFeatures();
    }
  }, []);

  const initializeNativeFeatures = async () => {
    try {
      // Configure status bar
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });

      // Hide splash screen after app is ready
      setTimeout(async () => {
        await SplashScreen.hide();
      }, 2000);

      // Configure keyboard
      Keyboard.addListener('keyboardWillShow', () => {
        // Handle keyboard showing
        document.body.classList.add('keyboard-open');
      });

      Keyboard.addListener('keyboardWillHide', () => {
        // Handle keyboard hiding
        document.body.classList.remove('keyboard-open');
      });

    } catch (error) {
      console.error('Error initializing native features:', error);
    }
  };

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.error('Error triggering haptic feedback:', error);
      }
    }
  };

  const hideKeyboard = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Keyboard.hide();
      } catch (error) {
        console.error('Error hiding keyboard:', error);
      }
    }
  };

  return {
    triggerHaptic,
    hideKeyboard
  };
};
