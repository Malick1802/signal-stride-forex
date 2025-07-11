
import React, { useState, useEffect } from 'react';
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
      console.log('📱 Initializing Firebase push notifications...');
      setPermissionError(null);
      
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Request permission for push notifications
      console.log('📱 Requesting push notification permissions...');
      const permission = await PushNotifications.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.receive === 'granted') {
        console.log('✅ Push notification permission granted');
        
        // Register with FCM to receive push notifications
        console.log('📱 Registering with FCM...');
        await PushNotifications.register();
        setIsRegistered(true);
      } else {
        console.log('❌ Push notification permission denied');
        setPermissionError('Push notification permission denied');
      }

      // Clear any existing listeners first
      await PushNotifications.removeAllListeners();

      // On successful registration, we get the FCM token
      PushNotifications.addListener('registration', (token) => {
        console.log('✅ FCM registration success, token: ' + token.value);
        setPushToken(token.value);
        localStorage.setItem('pushToken', token.value);
        setIsRegistered(true);
        setPermissionError(null);
        
        // TODO: Send this token to your backend server
        sendTokenToServer(token.value);
      });

      // Handle registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ FCM registration error: ' + JSON.stringify(error));
        setIsRegistered(false);
        setPermissionError('Push notification registration failed: ' + error.error);
      });

      // Handle notification received while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📱 Push notification received: ', notification);
        // Show local notification or update UI
      });

      // Handle notification tap
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('📱 Push notification tapped', notification.actionId, notification.inputValue);
        // Navigate to specific screen or perform action
      });

    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      setIsRegistered(false);
      setPermissionError('Failed to initialize push notifications: ' + (error as Error).message);
    }
  };

  const sendTokenToServer = async (token: string) => {
    try {
      console.log('📱 Sending FCM token to server...');
      
      // TODO: Replace with your actual backend endpoint
      // This is where you'd send the token to your Supabase edge function
      const response = await fetch('/api/register-push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: 'android',
          userId: 'current-user-id' // Replace with actual user ID
        })
      });
      
      if (response.ok) {
        console.log('✅ Token registered with server');
      } else {
        console.warn('⚠️ Failed to register token with server');
      }
    } catch (error) {
      console.error('❌ Error sending token to server:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!pushToken) {
      console.warn('⚠️ No push token available for test');
      return;
    }

    try {
      console.log('📱 Sending test push notification...');
      
      // TODO: This would typically be called from your backend
      // For now, this is just a placeholder
      const response = await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: pushToken,
          title: '🧪 Test Notification',
          body: 'Firebase push notification is working!',
          data: { type: 'test' }
        })
      });

      if (response.ok) {
        console.log('✅ Test notification sent');
      } else {
        console.warn('⚠️ Failed to send test notification');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  };

  return {
    isRegistered,
    pushToken,
    permissionError,
    initializePushNotifications,
    sendTestNotification
  };
};
