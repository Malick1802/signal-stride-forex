
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Centralized storage for push token using Capacitor Preferences
const getStoredPushToken = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: 'pushToken' });
    return value ?? null;
  } catch {
    return null;
  }
};

const setStoredPushToken = async (token: string) => {
  try {
    await Preferences.set({ key: 'pushToken', value: token });
  } catch (e) {
    console.warn('Failed to persist pushToken in Preferences', e);
  }
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      checkRegistrationStatus();
      
      // Listen for app state changes to re-check token
      const setupAppStateListener = async () => {
        try {
          const { App } = await import('@capacitor/app');
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive && user) {
              console.log('🔄 App became active - checking push token');
              checkRegistrationStatus();
            }
          });
        } catch (error) {
          console.log('ℹ️ App plugin not available:', error);
        }
      };
      
      setupAppStateListener();
    }
  }, []);

  // Re-check when user logs in and fetch from database if needed
  useEffect(() => {
    const run = async () => {
      if (user && Capacitor.isNativePlatform()) {
        await checkRegistrationStatus();
        const token = await getStoredPushToken();
        if (token) {
          console.log('🔄 Ensuring push token is saved for logged in user');
          await saveTokenToDatabase(token);
          setIsRegistered(true);
          setPushToken(token);
        } else {
          console.log('ℹ️ No stored push token found - checking database...');
          // Fetch from database in case token was registered on another session
          await fetchTokenFromDatabase();
        }
      }
    };
    run();
  }, [user]);

  const fetchTokenFromDatabase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error fetching push token from database:', error);
        return;
      }
      
      if (data?.push_token) {
        console.log('✅ Found push token in database, caching to Preferences');
        await setStoredPushToken(data.push_token);
        setPushToken(data.push_token);
        setIsRegistered(true);
      } else {
        console.log('ℹ️ No push token present in database for this user');
      }
    } catch (error) {
      console.error('❌ Error fetching push token:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      console.log('📱 Checking push notification registration status...');
      const token = await getStoredPushToken();
      if (token) {
        console.log('✅ Found existing push token (Preferences)');
        setPushToken(token);
        setIsRegistered(true);
      } else {
        console.log('ℹ️ No push token found');
        setIsRegistered(false);
        setPushToken(null);
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

    if (!user) {
      console.log('❌ No user authenticated for push notification setup');
      setPermissionError('User must be logged in to register for push notifications');
      return;
    }

    try {
      console.log('📱 Initializing push notifications...', { 
        userId: user.id, 
        userEmail: user.email 
      });
      setPermissionError(null);
      
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Clear any existing listeners first to prevent duplicates
      await PushNotifications.removeAllListeners();

      // Check current permissions first
      const currentPerms = await PushNotifications.checkPermissions();
      console.log('📱 Current permissions:', currentPerms);

      // Request permission for push notifications
      console.log('📱 Requesting push notification permissions...');
      const permission = await PushNotifications.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.receive === 'granted') {
        console.log('✅ Push notification permission granted');
        
        // Set up listeners before registering
        PushNotifications.addListener('registration', async (token) => {
          console.log('✅ Push registration success, token length:', token.value.length);
          console.log('✅ Token prefix:', token.value.substring(0, 30));
          
          setPushToken(token.value);
          await setStoredPushToken(token.value);
          setIsRegistered(true);
          setPermissionError(null);
          
          // Save token to database with enhanced error handling
          console.log('💾 Attempting to save token to database...');
          await saveTokenToDatabase(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Push registration error:', JSON.stringify(error));
          setIsRegistered(false);
          setPermissionError(`Registration failed: ${error.error || 'Unknown error'}`);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 Push notification received in foreground:', notification);
          // Handle foreground notifications
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('📱 Push notification action performed:', notification);
          // Handle notification tap actions
        });
        
        // Register with Apple / Google to receive push notifications
        console.log('📱 Registering for push notifications with platform...');
        await PushNotifications.register();
        
        // Set a timeout to catch registration issues
        setTimeout(() => {
          if (!pushToken && !permissionError) {
            console.warn('⚠️ Token registration taking longer than expected');
            setPermissionError('Token registration timeout - please try again');
          }
        }, 10000); // 10 second timeout
        
      } else {
        console.log('❌ Push notification permission denied:', permission);
        setPermissionError(`Permission denied: ${permission.receive}`);
      }

    } catch (error) {
      console.error('❌ Exception during push notification initialization:', error);
      setIsRegistered(false);
      setPermissionError(`Initialization failed: ${(error as Error).message}`);
    }
  };

  const saveTokenToDatabase = async (token: string) => {
    try {
      if (!user) {
        console.warn('⚠️ No user authenticated, cannot save push token');
        setPermissionError('User not authenticated - cannot save push token');
        return;
      }
      
      if (!user.id) {
        console.warn('⚠️ User ID is missing, cannot save push token');
        setPermissionError('User ID missing - cannot save push token');
        return;
      }

      console.log('💾 Saving push token to database via upsert...', {
        userId: user.id,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20)
      });
      
      const deviceType = Capacitor.getPlatform();

      // First check if user has an existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, push_token')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching existing profile:', fetchError);
        setPermissionError(`Profile fetch error: ${fetchError.message}`);
        return;
      }

      console.log('📋 Existing profile status:', existingProfile ? 'Found' : 'Not found');

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '', // Ensure email is set
            push_token: token,
            device_type: deviceType,
            push_enabled: true,
            push_notifications_enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('❌ Error saving push token:', error);
        setPermissionError(`Database save error: ${error.message}`);
        
        // If it's an RLS error, provide specific guidance
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          setPermissionError('Permission denied: User not properly authenticated for database access');
        }
      } else {
        console.log('✅ Push token saved to database (upsert)');
        setPermissionError(null); // Clear any previous errors
        
        // Verify the save by reading back
        const { data: verifyData, error: verifyError } = await supabase
          .from('profiles')
          .select('push_token, device_type, updated_at')
          .eq('id', user.id)
          .single();
          
        if (verifyError) {
          console.warn('⚠️ Could not verify token save:', verifyError);
        } else {
          console.log('✅ Token save verified:', {
            tokenSaved: !!verifyData.push_token,
            deviceType: verifyData.device_type,
            lastUpdated: verifyData.updated_at
          });
        }
      }
    } catch (error) {
      console.error('❌ Exception saving push token to database:', error);
      setPermissionError(`Save failed: ${(error as Error).message}`);
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
