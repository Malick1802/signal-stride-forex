
import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
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
      // Configure status bar for forex app
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      
      // Show status bar for trading data visibility
      await StatusBar.show();

      // Hide splash screen with delay for better UX
      setTimeout(async () => {
        await SplashScreen.hide({
          fadeOutDuration: 300
        });
      }, 2000);

      // Configure keyboard for mobile trading
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.body.classList.add('keyboard-open');
        // Adjust viewport for trading forms
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          setTimeout(() => {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });

      console.log('📱 ForexSignal Pro native features initialized');

    } catch (error) {
      console.error('❌ Error initializing native features:', error);
    }
  };

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.error('❌ Error triggering haptic feedback:', error);
      }
    }
  };

  const triggerSuccessHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (error) {
        console.error('❌ Error triggering success haptic:', error);
      }
    }
  };

  const triggerErrorHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch (error) {
        console.error('❌ Error triggering error haptic:', error);
      }
    }
  };

  const hideKeyboard = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Keyboard.hide();
      } catch (error) {
        console.error('❌ Error hiding keyboard:', error);
      }
    }
  };

  return {
    triggerHaptic,
    triggerSuccessHaptic,
    triggerErrorHaptic,
    hideKeyboard
  };
};
