
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
    console.log('🔄 Starting push notification initialization...');
    
    if (!Capacitor.isNativePlatform()) {
      const errorMsg = 'Push notifications are only available on native mobile platforms';
      console.log('🌐 ' + errorMsg);
      setPermissionError(errorMsg);
      return false;
    }

    if (!user?.id) {
      const errorMsg = 'User must be logged in to register for push notifications';
      console.log('❌ ' + errorMsg);
      setPermissionError(errorMsg);
      return false;
    }

    try {
      console.log('📱 Initializing push notifications...', { 
        userId: user.id, 
        userEmail: user.email,
        platform: Capacitor.getPlatform()
      });
      setPermissionError(null);
      
      const { PushNotifications } = await import('@capacitor/push-notifications');
      console.log('✅ PushNotifications plugin loaded');
      
      // Clear any existing listeners first to prevent duplicates
      await PushNotifications.removeAllListeners();
      console.log('🧹 Cleared existing listeners');

      // Check current permissions first
      console.log('🔐 Checking current permissions...');
      const currentPerms = await PushNotifications.checkPermissions();
      console.log('📱 Current permissions:', currentPerms);

      // Request permission if not granted
      if (currentPerms.receive !== 'granted') {
        console.log('📱 Requesting push notification permissions...');
        const permission = await PushNotifications.requestPermissions();
        console.log('📱 Permission result:', permission);
        
        if (permission.receive !== 'granted') {
          const errorMsg = `Permission denied: ${permission.receive}`;
          console.log('❌ ' + errorMsg);
          setPermissionError(errorMsg);
          return false;
        }
      }
      
      console.log('✅ Push notification permissions granted');
      
      // Set up listeners before registering with enhanced error handling
      let registrationCompleted = false;
      
      PushNotifications.addListener('registration', async (token) => {
        try {
          console.log('✅ Push registration success!', {
            tokenLength: token.value.length,
            tokenPrefix: token.value.substring(0, 30),
            platform: Capacitor.getPlatform()
          });
          
          registrationCompleted = true;
          setPushToken(token.value);
          
          // Store token locally with retry
          console.log('💾 Storing token locally...');
          await setStoredPushToken(token.value);
          console.log('✅ Token stored locally');
          
          setIsRegistered(true);
          setPermissionError(null);
          
          // Save token to database with enhanced error handling
          console.log('💾 Saving token to database...');
          const saveSuccess = await saveTokenToDatabase(token.value);
          
          if (saveSuccess) {
            console.log('✅ Full registration completed successfully');
          } else {
            console.warn('⚠️ Token saved locally but database save failed');
          }
        } catch (error) {
          console.error('❌ Error in registration listener:', error);
          setPermissionError(`Registration processing failed: ${(error as Error).message}`);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Push registration error:', error);
        registrationCompleted = true;
        setIsRegistered(false);
        setPermissionError(`Registration failed: ${error.error || JSON.stringify(error)}`);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📱 Push notification received in foreground:', notification);
        
        // Trigger haptic feedback for important notifications
        if (notification.data?.notificationType === 'new_signal' || notification.data?.notificationType === 'target_hit') {
          try {
            import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
              Haptics.impact({ style: ImpactStyle.Heavy });
            });
          } catch (e) {
            console.log('Haptics not available');
          }
        }
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('📱 Push notification action performed (background/closed app):', notification);
        
        // This is called when user taps notification while app is closed or in background
        const data = notification.notification.data;
        if (data?.route) {
          console.log('🔄 Should navigate to route:', data.route);
          // Navigation will be handled by the app when it becomes active
        }
      });
      
      // Register with platform (Apple/Google)
      console.log('📱 Registering with platform for push notifications...');
      await PushNotifications.register();
      
      // Enhanced timeout handling
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          if (!registrationCompleted) {
            console.warn('⚠️ Token registration timeout (15 seconds)');
            reject(new Error('Token registration timeout - please check your network connection and try again'));
          }
        }, 15000);
      });
      
      const registrationPromise = new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (registrationCompleted) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      await Promise.race([registrationPromise, timeoutPromise]);
      
      console.log('✅ Push notification initialization completed');
      return true;
        
    } catch (error) {
      console.error('❌ Exception during push notification initialization:', error);
      setIsRegistered(false);
      const errorMessage = `Initialization failed: ${(error as Error).message}`;
      setPermissionError(errorMessage);
      return false;
    }
  };

  const saveTokenToDatabase = async (token: string): Promise<boolean> => {
    console.log('💾 Starting database save operation...');
    
    try {
      if (!user?.id) {
        const errorMsg = 'User not authenticated - cannot save push token';
        console.warn('⚠️ ' + errorMsg);
        setPermissionError(errorMsg);
        return false;
      }

      console.log('💾 Saving push token to database...', {
        userId: user.id,
        userEmail: user.email,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20),
        platform: Capacitor.getPlatform()
      });
      
      const deviceType = Capacitor.getPlatform();

      // Enhanced authentication check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        const errorMsg = 'Invalid session - please log in again';
        console.error('❌ Session check failed:', sessionError);
        setPermissionError(errorMsg);
        return false;
      }

      // Check existing profile with retries
      let existingProfile = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, push_token, device_type')
          .eq('id', user.id)
          .maybeSingle();

        if (!fetchError) {
          existingProfile = data;
          break;
        }
        
        console.warn(`⚠️ Profile fetch attempt ${retryCount + 1} failed:`, fetchError);
        retryCount++;
        
        if (retryCount === maxRetries) {
          setPermissionError(`Profile fetch failed after ${maxRetries} attempts: ${fetchError.message}`);
          return false;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }

      console.log('📋 Existing profile:', existingProfile ? 'Found' : 'Not found', existingProfile);

      // Upsert with comprehensive data
      const upsertData = {
        id: user.id,
        email: user.email || existingProfile?.email || '',
        push_token: token,
        device_type: deviceType,
        push_enabled: true,
        push_notifications_enabled: true,
        push_new_signals: true,
        push_targets_hit: true,
        push_stop_loss: true,
        push_market_updates: true,
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Upserting profile data:', { ...upsertData, push_token: `${token.substring(0, 20)}...` });

      const { data: upsertResult, error: upsertError } = await supabase
        .from('profiles')
        .upsert(upsertData, { 
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('❌ Upsert failed:', upsertError);
        
        // Enhanced error handling
        if (upsertError.message.includes('row-level security') || upsertError.message.includes('RLS')) {
          setPermissionError('Database access denied - authentication issue');
        } else if (upsertError.message.includes('unique constraint')) {
          setPermissionError('Database constraint violation - please contact support');
        } else {
          setPermissionError(`Database save error: ${upsertError.message}`);
        }
        return false;
      }

      console.log('✅ Upsert completed successfully');
      
      // Enhanced verification with retry
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for consistency
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('push_token, device_type, push_enabled, updated_at')
        .eq('id', user.id)
        .single();
        
      if (verifyError) {
        console.warn('⚠️ Could not verify token save:', verifyError);
        // Don't fail on verification error - upsert might have succeeded
      } else {
        const verificationResult = {
          tokenMatches: verifyData.push_token === token,
          deviceType: verifyData.device_type,
          pushEnabled: verifyData.push_enabled,
          lastUpdated: verifyData.updated_at
        };
        
        console.log('✅ Token save verification:', verificationResult);
        
        if (!verificationResult.tokenMatches) {
          console.error('❌ Token verification failed - saved token does not match');
          setPermissionError('Token verification failed - please try again');
          return false;
        }
      }
      
      console.log('✅ Database save completed successfully');
      setPermissionError(null);
      return true;
      
    } catch (error) {
      console.error('❌ Exception during database save:', error);
      const errorMessage = `Database save failed: ${(error as Error).message}`;
      setPermissionError(errorMessage);
      return false;
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
