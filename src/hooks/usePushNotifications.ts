
import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Request permission for push notifications
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Register with Apple / Google to receive push notifications
        await PushNotifications.register();
        setIsRegistered(true);
      }

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        setPushToken(token.value);
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
        // Handle the notification while app is in foreground
      });

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed', notification.actionId, notification.inputValue);
        // Handle notification tap
      });

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const sendNotificationToDevice = async (token: string, title: string, body: string, data?: any) => {
    // This would typically be called from your backend
    // Placeholder for sending notifications via your server
    console.log('Would send notification:', { token, title, body, data });
  };

  return {
    isRegistered,
    pushToken,
    sendNotificationToDevice
  };
};
