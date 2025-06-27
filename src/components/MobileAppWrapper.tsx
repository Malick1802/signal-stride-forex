import React, { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { Capacitor } from '@capacitor/core';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

const MobileAppWrapper: React.FC<MobileAppWrapperProps> = ({ children }) => {
  const { isRegistered, pushToken } = usePushNotifications();
  const { triggerHaptic } = useNativeFeatures();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 ForexAlert Pro mobile app initialized');
      
      // Initialize mobile notifications
      MobileNotificationManager.initialize();
      
      // Add mobile-specific styles
      document.body.classList.add('mobile-app');
      
      // Optimize for mobile performance with type-safe webkit properties
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitTouchCallout = 'none';
      (document.body.style as any).webkitTapHighlightColor = 'transparent';
      
      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      const preventZoom = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      
      document.addEventListener('touchend', preventZoom, { passive: false });
      
      // Handle touch feedback for trading actions
      const handleTouchFeedback = () => {
        triggerHaptic();
      };
      
      // Add haptic feedback to buttons
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        button.addEventListener('touchstart', handleTouchFeedback);
      });
      
      return () => {
        document.removeEventListener('touchend', preventZoom);
        buttons.forEach(button => {
          button.removeEventListener('touchstart', handleTouchFeedback);
        });
      };
    }
  }, [triggerHaptic]);

  useEffect(() => {
    if (isRegistered && pushToken) {
      console.log('📱 Push notifications registered for ForexAlert Pro:', pushToken);
      // Here you would typically send the token to your backend
      // to register it for signal notifications
    }
  }, [isRegistered, pushToken]);

  return (
    <div className="mobile-app-wrapper min-h-screen">
      {children}
    </div>
  );
};

export default MobileAppWrapper;
