
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      checkRegistrationStatus();
    }
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      console.log('📱 Checking push notification registration status...');
      
      // Check if push notifications are already registered
      const token = localStorage.getItem('pushToken');
      if (token) {
        console.log('✅ Found existing push token');
        setPushToken(token);
        setIsRegistered(true);
      } else {
        console.log('ℹ️ No push token found');
      }
    } catch (error) {
      console.error('❌ Error checking push notification status:', error);
      setPermissionError('Failed to check notification status');
    }
  };

  const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Push notifications are only available on native platforms');
      setPermissionError('Push notifications require mobile app');
      return;
    }

    try {
      console.log('📱 Initializing push notifications...');
      setPermissionError(null);
      
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Request permission for push notifications
      console.log('📱 Requesting push notification permissions...');
      const permission = await PushNotifications.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.receive === 'granted') {
        console.log('✅ Push notification permission granted');
        
        // Register with Apple / Google to receive push notifications
        console.log('📱 Registering for push notifications...');
        await PushNotifications.register();
        setIsRegistered(true);
      } else {
        console.log('❌ Push notification permission denied');
        setPermissionError('Push notification permission denied');
      }

      // Clear any existing listeners first
      await PushNotifications.removeAllListeners();

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', (token) => {
        console.log('✅ Push registration success, token: ' + token.value);
        setPushToken(token.value);
        localStorage.setItem('pushToken', token.value);
        setIsRegistered(true);
        setPermissionError(null);
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Error on registration: ' + JSON.stringify(error));
        setIsRegistered(false);
        setPermissionError('Push notification registration failed: ' + error.error);
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📱 Push notification received: ', notification);
        // Handle the notification while app is in foreground
      });

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('📱 Push notification action performed', notification.actionId, notification.inputValue);
        // Handle notification tap
      });

    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      setIsRegistered(false);
      setPermissionError('Failed to initialize push notifications: ' + (error as Error).message);
    }
  };

  const sendNotificationToDevice = async (token: string, title: string, body: string, data?: any) => {
    // This would typically be called from your backend
    // Placeholder for sending notifications via your server
    console.log('📱 Would send notification:', { token, title, body, data });
  };

  return {
    isRegistered,
    pushToken,
    permissionError,
    initializePushNotifications,
    sendNotificationToDevice
  };
};
