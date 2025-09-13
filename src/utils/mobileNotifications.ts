import { Capacitor } from '@capacitor/core';

export class MobileNotificationManager {
  /**
   * Generate a safe notification ID for Android compatibility
   * Java int max value is 2,147,483,647
   */
  private static generateSafeId(): number {
    return Math.floor(Date.now() % 2147483647);
  }
  /**
   * Send a test local notification
   */
  static async testNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Local notifications are only available on native platforms');
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Request permissions first
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        throw new Error('Local notification permission denied');
      }

      // Schedule a test notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🧪 Test Notification',
            body: 'Your local notifications are working correctly!',
            id: this.generateSafeId(),
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            sound: 'default',
            smallIcon: 'ic_stat_your_custom_icon',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              source: 'MobileNotificationManager',
              test: true
            }
          }
        ]
      });

      console.log('✅ Test local notification scheduled');
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Create notification channels for Android
   */
  static async setupNotificationChannels(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Skipping notification channels - not native platform');
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // High priority signal channel with custom sound
      await LocalNotifications.createChannel({
        id: 'forex_signals_v3',
        name: 'Forex Trading Signals',
        description: 'Critical trading signals and market updates',
        sound: 'coin_notification', // Custom sound for Android (no extension)
        importance: 5,
        visibility: 1,
        lights: true,
        vibration: true,
        lightColor: '#FF0000'
      });

      // Trade alerts with different sound
      await LocalNotifications.createChannel({
        id: 'trade_alerts_v3', 
        name: 'Trade Alerts',
        description: 'Target hits, stop losses, and trade outcomes',
        sound: 'coin_notification', // Custom sound for Android (no extension)
        importance: 5,
        visibility: 1,
        lights: true,
        vibration: true,
        lightColor: '#00FF00'
      });

      // Market updates channel
      await LocalNotifications.createChannel({
        id: 'market_updates_v3',
        name: 'Market Updates', 
        description: 'General market news and updates',
        sound: 'coin_notification', // Custom sound for Android (no extension)
        importance: 4,
        visibility: 1,
        lights: true,
        vibration: true
      });

      console.log('✅ Enhanced notification channels created with custom sounds');
    } catch (error) {
      console.error('❌ Failed to create notification channels:', error);
      // Don't throw - app should work without channels
    }
  }

  /**
   * Initialize notification listeners
   */
  static async initializeListeners(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Skipping notification listeners - not native platform');
      return;
    }

    try {
      const [localNotifications, pushNotifications] = await Promise.all([
        import('@capacitor/local-notifications'),
        import('@capacitor/push-notifications')
      ]);
      
      const { LocalNotifications } = localNotifications;
      const { PushNotifications } = pushNotifications;
      
      // Local notification listeners
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('📱 Local notification received:', notification);
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        console.log('📱 Local notification action performed:', notificationAction);
        // Handle navigation based on notification data
        if (notificationAction.notification.extra?.route) {
          console.log('🔄 Navigating to:', notificationAction.notification.extra.route);
        }
      });

      // Push notification listeners for background handling
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📱 Push notification received in foreground:', notification);
        
        // Show local notification when app is in foreground
        this.showInstantSignalNotification(
          notification.title || 'New Alert',
          notification.body || 'You have a new notification',
          notification.data
        );
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('📱 Push notification action performed:', notification);
        
        // Handle deep linking and navigation
        if (notification.notification.data?.route) {
          console.log('🔄 Navigating to route:', notification.notification.data.route);
        }
      });

      console.log('✅ Enhanced notification listeners initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification listeners:', error);
      // Don't throw - app should work without listeners
    }
  }

  /**
   * Check notification permissions
   */
  static async checkPermissions(): Promise<{
    display: string;
    sound: string;
    alert: string;
    badge: string;
  }> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Permissions check only available on native platforms');
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permissions = await LocalNotifications.checkPermissions();
      return {
        display: permissions.display,
        sound: 'unknown', // Not available in LocalNotifications
        alert: 'unknown', // Not available in LocalNotifications
        badge: 'unknown'  // Not available in LocalNotifications
      };
    } catch (error) {
      console.error('❌ Failed to check notification permissions:', error);
      throw error;
    }
  }

  /**
   * Initialize mobile notifications with crash protection
   */
  static async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Skipping notifications - not native platform');
      return;
    }

    try {
      console.log('📱 Initializing mobile notifications...');
      
      // Add timeout protection
      const initPromise = Promise.all([
        this.setupNotificationChannels(),
        this.initializeListeners()
      ]);
      
      await Promise.race([
        initPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Notification init timeout')), 5000)
        )
      ]);
      
      console.log('✅ Mobile notifications initialized successfully');
    } catch (error) {
      console.warn('⚠️ Notification initialization failed (non-critical):', error);
      // Don't throw - app should continue without notifications
    }
  }

  /**
   * Check native notification support
   */
  static async checkNativeNotificationSupport(): Promise<boolean> {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check push notification support
   */
  static async checkPushNotificationSupport(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      return !!PushNotifications;
    } catch {
      return false;
    }
  }

  /**
   * Check web notification support
   */
  static async checkWebNotificationSupport(): Promise<boolean> {
    return !Capacitor.isNativePlatform() && 'Notification' in window;
  }

  /**
   * Show instant signal notification
   */
  static async showInstantSignalNotification(title: string, body: string, data?: any): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: this.generateSafeId(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'coin_notification',
            smallIcon: 'ic_stat_your_custom_icon',
            attachments: undefined,
            actionTypeId: '',
            channelId: 'forex_signals_v3',
            extra: {
              ...data,
              source: 'signal',
              type: 'instant',
              route: '/dashboard'
            }
          }
        ]
      });

      console.log('✅ Enhanced instant signal notification scheduled');
    } catch (error) {
      console.error('❌ Failed to show instant signal notification:', error);
    }
  }

  /**
   * Show signal outcome notification
   */
  static async showSignalOutcomeNotification(title: string, body: string, data?: any): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: this.generateSafeId(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'coin_notification',
            smallIcon: 'ic_stat_your_custom_icon',
            attachments: undefined,
            actionTypeId: '',
            channelId: 'trade_alerts_v3',
            extra: {
              ...data,
              source: 'signal',
              type: 'outcome',
              route: '/dashboard'
            }
          }
        ]
      });

      console.log('✅ Enhanced signal outcome notification scheduled');
    } catch (error) {
      console.error('❌ Failed to show signal outcome notification:', error);
    }
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error);
      return false;
    }
  }
}