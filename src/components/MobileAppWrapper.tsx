
import React, { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { Capacitor } from '@capacitor/core';
import MobileErrorBoundary from './MobileErrorBoundary';
import MobileConnectionStatus from './MobileConnectionStatus';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

const MobileAppWrapper: React.FC<MobileAppWrapperProps> = ({ children }) => {
  const { isRegistered, pushToken } = usePushNotifications();
  const { triggerHaptic } = useNativeFeatures();
  const { isConnected, connectionType } = useMobileConnectivity();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 ForexAlert Pro mobile app initialized');
      console.log('📱 Platform:', Capacitor.getPlatform());
      console.log('🌐 Connection:', isConnected ? `Connected (${connectionType})` : 'Disconnected');
      
      // Initialize mobile notifications
      MobileNotificationManager.initialize();
      
      // Add mobile-specific styles
      document.body.classList.add('mobile-app');
      
      // Enhanced mobile optimizations
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitTouchCallout = 'none';
      (document.body.style as any).webkitTapHighlightColor = 'transparent';
      
      // Prevent zoom on inputs
      const metaViewport = document.querySelector('meta[name=viewport]');
      if (metaViewport) {
        metaViewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
      
      // Enhanced touch handling for mobile
      let lastTouchEnd = 0;
      const preventZoom = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      
      document.addEventListener('touchend', preventZoom, { passive: false });
      
      // Enhanced haptic feedback for all interactive elements
      const addHapticFeedback = () => {
        const interactiveElements = document.querySelectorAll('button, [role="button"], a, input, select, textarea');
        interactiveElements.forEach(element => {
          element.addEventListener('touchstart', () => {
            triggerHaptic();
          }, { passive: true });
        });
      };
      
      // Initial setup
      addHapticFeedback();
      
      // Re-setup haptic feedback when DOM changes
      const observer = new MutationObserver(addHapticFeedback);
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Enhanced error handling
      window.addEventListener('unhandledrejection', (event) => {
        console.error('🚨 Mobile: Unhandled promise rejection:', event.reason);
        // Don't preventDefault() to allow error boundary to catch it
      });
      
      window.addEventListener('error', (event) => {
        console.error('🚨 Mobile: Global error:', event.error);
      });
      
      return () => {
        document.removeEventListener('touchend', preventZoom);
        observer.disconnect();
      };
    } else {
      console.log('🌐 ForexAlert Pro web app initialized');
    }
  }, [triggerHaptic, isConnected, connectionType]);

  useEffect(() => {
    if (isRegistered && pushToken) {
      console.log('📱 Push notifications registered for ForexAlert Pro:', pushToken);
      
      // Show connection status notification
      if (Capacitor.isNativePlatform()) {
        MobileNotificationManager.scheduleSignalAlert({
          title: 'ForexAlert Pro Connected',
          body: `Ready to receive trading signals on ${Capacitor.getPlatform()}`,
          data: { type: 'connection_status' }
        }, 1000);
      }
    }
  }, [isRegistered, pushToken]);

  // Monitor connection changes and provide feedback
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      if (isConnected) {
        console.log('📶 Mobile: Connection restored');
        // Trigger success haptic when connection is restored
        triggerHaptic();
      } else {
        console.log('📵 Mobile: Connection lost');
      }
    }
  }, [isConnected, triggerHaptic]);

  return (
    <MobileErrorBoundary>
      <div className="mobile-app-wrapper min-h-screen">
        {/* Show connection status only when disconnected on mobile */}
        {Capacitor.isNativePlatform() && !isConnected && (
          <div className="sticky top-0 z-50 p-4">
            <MobileConnectionStatus />
          </div>
        )}
        
        {children}
      </div>
    </MobileErrorBoundary>
  );
};

export default MobileAppWrapper;
