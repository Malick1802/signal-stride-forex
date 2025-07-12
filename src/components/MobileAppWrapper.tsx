
import React, { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { Capacitor } from '@capacitor/core';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

const MobileAppWrapper: React.FC<MobileAppWrapperProps> = ({ children }) => {
  const { isRegistered, pushToken } = usePushNotifications();
  const { triggerHaptic } = useNativeFeatures();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Running as native mobile app');
      
      // Add mobile-specific styles
      document.body.classList.add('mobile-app');
      
      // Disable text selection on mobile for better UX
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      
      // Prevent zoom on double tap
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      });

      let lastTouchEnd = 0;
      document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    }
  }, []);

  useEffect(() => {
    if (isRegistered && pushToken) {
      console.log('Push notifications registered with token:', pushToken);
      // Here you would typically send the token to your backend
      // to store it for sending notifications
    }
  }, [isRegistered, pushToken]);

  return (
    <div className="mobile-app-wrapper">
      {children}
    </div>
  );
};

export default MobileAppWrapper;
