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
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.createChannel({
        id: 'forex-signals',
        name: 'Forex Trading Signals',
        description: 'New trading signals and market updates',
        sound: 'default',
        importance: 5,
        visibility: 1,
        lights: true,
        vibration: true
      });

      await LocalNotifications.createChannel({
        id: 'trade-alerts',
        name: 'Trade Alerts',
        description: 'Target hits, stop losses, and trade updates',
        sound: 'default',
        importance: 5,
        visibility: 1,
        lights: true,
        vibration: true
      });

      console.log('✅ Notification channels created');
    } catch (error) {
      console.error('❌ Failed to create notification channels:', error);
      throw error;
    }
  }

  /**
   * Initialize notification listeners
   */
  static async initializeListeners(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Listen for notification taps
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('📱 Local notification received:', notification);
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        console.log('📱 Local notification action performed:', notificationAction);
      });

      console.log('✅ Local notification listeners initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification listeners:', error);
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
   * Initialize mobile notifications
   */
  static async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await this.setupNotificationChannels();
      await this.initializeListeners();
      console.log('✅ Mobile notifications initialized');
    } catch (error) {
      console.error('❌ Failed to initialize mobile notifications:', error);
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
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              ...data,
              source: 'signal',
              type: 'instant'
            }
          }
        ]
      });

      console.log('✅ Instant signal notification scheduled');
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
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              ...data,
              source: 'signal',
              type: 'outcome'
            }
          }
        ]
      });

      console.log('✅ Signal outcome notification scheduled');
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