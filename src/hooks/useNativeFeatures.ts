
import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export const useNativeFeatures = () => {
  const triggerHaptic = useCallback(async (style: 'Light' | 'Medium' | 'Heavy' = 'Light') => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle[style] });
    } catch (error) {
      console.warn('❌ Haptic feedback not available:', error);
    }
  }, []);

  const triggerSuccessHaptic = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.warn('❌ Success haptic not available:', error);
    }
  }, []);

  const triggerErrorHaptic = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.warn('❌ Error haptic not available:', error);
    }
  }, []);

  const hideKeyboard = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      await Keyboard.hide();
    } catch (error) {
      console.warn('❌ Keyboard hide not available:', error);
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupKeyboardListeners = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        
        const keyboardWillShowListener = await Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.classList.add('keyboard-open');
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement) {
            setTimeout(() => {
              activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        });

        const keyboardWillHideListener = await Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-open');
        });

        return () => {
          keyboardWillShowListener.remove();
          keyboardWillHideListener.remove();
        };
      } catch (error) {
        console.warn('❌ Keyboard listeners setup failed:', error);
      }
    };

    setupKeyboardListeners();
  }, []);

  return {
    triggerHaptic,
    triggerSuccessHaptic,
    triggerErrorHaptic,
    hideKeyboard
  };
};
