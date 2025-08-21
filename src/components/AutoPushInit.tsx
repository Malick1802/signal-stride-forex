import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const AutoPushInit: React.FC = () => {
  const { initializePushNotifications } = usePushNotifications();

  useEffect(() => {
    const init = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          console.log('🔔 AutoPushInit: Initializing push notifications...');
          await initializePushNotifications();
          console.log('✅ AutoPushInit: Push notifications initialized');
        } else {
          console.log('ℹ️ AutoPushInit: Not a native platform, skipping');
        }
      } catch (err) {
        console.error('❌ AutoPushInit: Failed to initialize push notifications', err);
      }
    };
    init();
  }, [initializePushNotifications]);

  return null;
};

export default AutoPushInit;
