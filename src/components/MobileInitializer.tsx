import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import MobileNotificationTester from './MobileNotificationTester';

interface MobileInitializerProps {
  onStatusUpdate?: (status: string) => void;
  showTester?: boolean;
}

export const MobileInitializer: React.FC<MobileInitializerProps> = ({ onStatusUpdate, showTester = false }) => {
  useEffect(() => {
    const initializeMobileFeatures = async () => {
      if (!Capacitor.isNativePlatform()) {
        onStatusUpdate?.('Not a native platform - skipping mobile initialization');
        return;
      }

      try {
        onStatusUpdate?.('Initializing mobile features...');
        
        // Initialize notification channels (Android)
        await MobileNotificationManager.setupNotificationChannels();
        onStatusUpdate?.('✅ Notification channels configured');
        
        // Initialize notification listeners
        await MobileNotificationManager.initializeListeners();
        onStatusUpdate?.('✅ Notification listeners initialized');
        
        onStatusUpdate?.('✅ Mobile initialization complete');
      } catch (error) {
        console.error('❌ Mobile initialization failed:', error);
        onStatusUpdate?.(`❌ Mobile initialization failed: ${error}`);
      }
    };

    initializeMobileFeatures();
  }, [onStatusUpdate]);

  if (showTester && Capacitor.isNativePlatform()) {
    return <MobileNotificationTester onStatusUpdate={onStatusUpdate} />;
  }

  // This component doesn't render anything by default
  return null;
};

export default MobileInitializer;