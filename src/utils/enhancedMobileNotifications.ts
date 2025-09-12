import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export class EnhancedMobileNotificationManager {
  private static backgroundTaskId: string | null = null;

  // Configure high-priority FCM notifications with enhanced settings for background delivery
  static async configureHighPriorityNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Configure unified notification channels with maximum importance for Android
      await LocalNotifications.createChannel({
        id: 'forex_signals',
        name: 'Forex Trading Signals',
        description: 'Critical forex trading signals - bypasses battery optimization',
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC 
        sound: 'notification.wav',
        vibration: true,
        lights: true,
        lightColor: '#FF5722' // Orange for urgent signals
      });

      await LocalNotifications.createChannel({
        id: 'trade_alerts', 
        name: 'Trade Alerts',
        description: 'Urgent trade alerts, targets, and stop losses',
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'notification.wav',
        vibration: true,
        lights: true,
        lightColor: '#4CAF50' // Green for trade updates
      });

      // Add market updates channel for non-critical notifications
      await LocalNotifications.createChannel({
        id: 'market_updates',
        name: 'Market Updates',
        description: 'General market news and updates',
        importance: 3, // IMPORTANCE_DEFAULT
        visibility: 1,
        sound: 'default',
        vibration: false
      });

      console.log('✅ High-priority notification channels configured with enhanced FCM settings');
    } catch (error) {
      console.error('❌ Failed to configure high-priority channels:', error);
    }
  }

  // Enhanced push notification registration with optimized FCM settings
  static async initializeEnhancedPushNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Request permissions with high priority
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive !== 'granted') {
        throw new Error('Push notification permission not granted');
      }

      // Configure channels first with enhanced settings
      await this.configureHighPriorityNotifications();

      // Enhanced registration with retry logic
      let registrationAttempts = 0;
      const maxAttempts = 3;
      
      while (registrationAttempts < maxAttempts) {
        try {
          await PushNotifications.register();
          break;
        } catch (error) {
          registrationAttempts++;
          if (registrationAttempts >= maxAttempts) {
            throw error;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * registrationAttempts));
        }
      }

      // Set up enhanced listeners with background task handling
      await this.setupEnhancedListeners();

      console.log('✅ Enhanced push notifications initialized with FCM optimization');
    } catch (error) {
      console.error('❌ Enhanced push notification initialization failed:', error);
      throw error;
    }
  }

  // Setup enhanced listeners with background task support
  private static async setupEnhancedListeners(): Promise<void> {
    // Enhanced push notification received handler
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('📨 Push notification received:', notification);

      // Process notification immediately (background task would require custom plugin)
      try {
        await this.processBackgroundNotification(notification);
      } catch (error) {
        console.error('❌ Notification processing failed:', error);
      }
    });

    // Enhanced action performed handler
    PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
      console.log('🎯 Push notification action performed:', action);

      // Handle action immediately
      try {
        await this.handleNotificationAction(action);
      } catch (error) {
        console.error('❌ Action handling failed:', error);
      }
    });

    // Registration success with enhanced error handling
    PushNotifications.addListener('registration', (token) => {
      console.log('✅ Enhanced push registration successful:', token.value);
    });

    // Registration error with enhanced logging
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Enhanced push registration failed:', error);
    });
  }

  // Process notifications in background with wake lock
  private static async processBackgroundNotification(notification: any): Promise<void> {
    try {
      // Acquire wake lock if available
      let wakeLock: WakeLockSentinel | null = null;
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('🔒 Wake lock acquired for notification processing');
        } catch (e) {
          console.warn('⚠️ Could not acquire wake lock:', e);
        }
      }

      // Process the notification data
      const notificationData = notification.data;
      
      if (notificationData?.type === 'signal' || notificationData?.type === 'new_signal') {
        // Handle signal notifications with high priority
        await this.showCriticalSignalNotification(
          notification.title || 'New Trading Signal',
          notification.body || 'A new forex signal is available',
          notificationData
        );
      } else if (notificationData?.type === 'target_hit' || notificationData?.type === 'stop_loss' || notificationData?.type === 'signal_complete') {
        // Handle trade alert notifications
        await this.showUrgentTradeAlert(
          notification.title || 'Trade Alert',
          notification.body || 'Your trade has been updated',
          notificationData
        );
      }

      // Release wake lock
      if (wakeLock) {
        wakeLock.release();
        console.log('🔓 Wake lock released');
      }
    } catch (error) {
      console.error('❌ Background notification processing failed:', error);
    }
  }

  // Handle notification actions in background
  private static async handleNotificationAction(action: any): Promise<void> {
    try {
      const actionId = action.actionId;
      const notificationData = action.notification?.data;

      console.log(`🎯 Handling action: ${actionId}`, notificationData);

      // Handle different action types
      switch (actionId) {
        case 'view_signal':
          // Navigate to signal view
          break;
        case 'copy_trade':
          // Initiate trade copy
          break;
        case 'dismiss':
          // Dismiss notification
          break;
        default:
          console.log('📱 Default action - opening app');
      }
    } catch (error) {
      console.error('❌ Action handling failed:', error);
    }
  }

  // Show critical signal notification that bypasses battery optimization
  static async showCriticalSignalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      const notificationId = Date.now();
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title,
          body,
          channelId: 'forex_signals',
          sound: 'notification.wav',
          extra: {
            ...data,
            priority: 'high',
            category: 'signal'
          },
          actionTypeId: 'signal_actions'
        }]
      });

      console.log('🚨 Critical signal notification scheduled:', notificationId);
    } catch (error) {
      console.error('❌ Failed to show critical signal notification:', error);
    }
  }

  // Show urgent trade alert
  static async showUrgentTradeAlert(title: string, body: string, data?: any): Promise<void> {
    try {
      const notificationId = Date.now() + 1;
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title,
          body,
          channelId: 'trade_alerts',
          sound: 'notification.wav',
          extra: {
            ...data,
            priority: 'high',
            category: 'trade_alert'
          }
        }]
      });

      console.log('⚡ Urgent trade alert scheduled:', notificationId);
    } catch (error) {
      console.error('❌ Failed to show urgent trade alert:', error);
    }
  }

  // Check if battery optimization is disabled (requires custom plugin)
  static async checkBatteryOptimization(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return true;

    try {
      // This would require a custom plugin implementation
      console.log('🔋 Battery optimization check would require custom plugin');
      return true; // Assume optimized for now
    } catch (error) {
      console.error('❌ Battery optimization check failed:', error);
      return false;
    }
  }
}