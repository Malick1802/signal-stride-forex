
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      checkRegistrationStatus();
    }
  }, []);

  // Re-check when user logs in
  useEffect(() => {
    if (user && Capacitor.isNativePlatform()) {
      checkRegistrationStatus();
      // If we have a token but push notifications are disabled, re-enable them
      const token = localStorage.getItem('pushToken');
      if (token && !isRegistered) {
        console.log('🔄 Re-enabling push notifications for logged in user');
        saveTokenToDatabase(token);
        setIsRegistered(true);
        setPushToken(token);
      }
    }
  }, [user]);

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
      
      // Clear any existing listeners first to prevent duplicates
      await PushNotifications.removeAllListeners();

      // Request permission for push notifications
      console.log('📱 Requesting push notification permissions...');
      const permission = await PushNotifications.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.receive === 'granted') {
        console.log('✅ Push notification permission granted');
        
        // Set up listeners before registering
        PushNotifications.addListener('registration', async (token) => {
          console.log('✅ Push registration success, token: ' + token.value);
          setPushToken(token.value);
          localStorage.setItem('pushToken', token.value);
          setIsRegistered(true);
          setPermissionError(null);
          
          // Save token to database
          if (user) {
            await saveTokenToDatabase(token.value);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Error on registration: ' + JSON.stringify(error));
          setIsRegistered(false);
          setPermissionError('Registration failed: ' + error.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 Push notification received: ', notification);
          // Handle foreground notifications
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('📱 Push notification tapped', notification);
          // Handle notification tap actions
        });
        
        // Register with Apple / Google to receive push notifications
        console.log('📱 Registering for push notifications...');
        await PushNotifications.register();
      } else {
        console.log('❌ Push notification permission denied');
        setPermissionError('Push notification permission denied');
      }

    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      setIsRegistered(false);
      setPermissionError('Failed to initialize: ' + (error as Error).message);
    }
  };

  const saveTokenToDatabase = async (token: string) => {
    try {
      if (!user) return;
      
      console.log('💾 Saving push token to database...');
      
      const deviceType = Capacitor.getPlatform();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: token,
          device_type: deviceType,
          push_enabled: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Error saving push token:', error);
      } else {
        console.log('✅ Push token saved to database');
      }
    } catch (error) {
      console.error('❌ Error saving push token to database:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      console.log('📱 Sending test push notification...');
      
      // First try sending a local notification (for immediate feedback)
      if (Capacitor.isNativePlatform()) {
        try {
          const { MobileNotificationManager } = await import('@/utils/mobileNotifications');
          await MobileNotificationManager.testNotification();
          console.log('✅ Local test notification sent');
        } catch (localError) {
          console.error('❌ Error sending local test notification:', localError);
          setPermissionError(`Could not send test notification: ${(localError as Error).message}`);
          return;
        }
      }
      
      // Then try sending a push notification via backend
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: '🚀 Push Test Notification',
          body: 'Your push notifications are working correctly!',
          data: { test: true },
          notificationType: 'signal',
          userIds: user ? [user.id] : undefined,
        }
      });

      if (error) {
        console.error('❌ Error sending push notification:', error);
        setPermissionError(`Failed to send test notification: ${error.message}`);
      } else {
        console.log('✅ Push test notification sent:', data);
        setPermissionError(null);
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      setPermissionError(`Failed to send test notification: ${(error as Error).message}`);
    }
  };

  return {
    isRegistered,
    pushToken,
    permissionError,
    initializePushNotifications,
    sendTestNotification,
    saveTokenToDatabase
  };
};
