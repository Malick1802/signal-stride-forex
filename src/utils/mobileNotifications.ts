
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

interface SignalNotification {
  title: string;
  body: string;
  data?: any;
  scheduled?: Date;
  sound?: string;
  vibrate?: boolean;
}

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: number;
  sound?: string;
}

export class MobileNotificationManager {
  static async initialize(): Promise<boolean> {
    console.log('📱 Initializing MobileNotificationManager...');
    console.log('📱 Platform info:', {
      isNativePlatform: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      userAgent: navigator.userAgent
    });
    
    // First check if we have Capacitor native APIs available
    const hasNativeNotifications = await this.checkNativeNotificationSupport();
    console.log('📱 Native notification support:', hasNativeNotifications);
    
    if (hasNativeNotifications) {
      console.log('📱 Using native LocalNotifications');
      return await this.initializeNativeNotifications();
    } else {
      console.log('🌐 Falling back to web notifications');
      return await this.initializeWebNotifications();
    }
  }

  static async checkNativeNotificationSupport(): Promise<boolean> {
    try {
      // Only check native notifications if we're actually in a native platform
      if (!Capacitor.isNativePlatform()) {
        console.log('❌ Not a native platform');
        return false;
      }

      // Try to import and check if LocalNotifications is available
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('✅ LocalNotifications imported successfully');
      
      // Test if the plugin is actually available by calling checkPermissions
      const permissions = await LocalNotifications.checkPermissions();
      console.log('✅ LocalNotifications permissions check successful:', permissions);
      return true;
    } catch (error) {
      console.log('❌ LocalNotifications not available:', error);
      return false;
    }
  }

  static async checkWebNotificationSupport(): Promise<boolean> {
    // Check if Notification API is available in the browser
    if ('Notification' in window) {
      console.log('✅ Web Notification API is available');
      return true;
    } else {
      console.log('❌ Web Notification API not available');
      return false;
    }
  }

  static async checkPushNotificationSupport(): Promise<boolean> {
    // Check if Push API is available (for future use)
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      console.log('✅ Push Notification API is available');
      return true;
    } else {
      console.log('❌ Push Notification API not available');
      return false;
    }
  }

  static async initializeWebNotifications(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('❌ Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Web notification permissions already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Web notification permissions denied');
      return false;
    }

    try {
      console.log('🔔 Requesting web notification permission...');
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Web notification permissions granted');
        return true;
      } else {
        console.log('❌ Web notification permissions denied by user');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  static async initializeNativeNotifications(): Promise<boolean> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('📱 LocalNotifications plugin imported successfully');
      
      // Check current permissions first
      const currentPermissions = await LocalNotifications.checkPermissions();
      console.log('📱 Current permissions:', currentPermissions);
      
      if (currentPermissions.display === 'granted') {
        console.log('✅ Native notification permissions already granted');
        await this.setupNativeEnvironment();
        return true;
      }
      
      // Request permissions if not granted
      console.log('📱 Requesting native notification permissions...');
      const permission = await LocalNotifications.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.display === 'granted') {
        console.log('✅ Native notification permissions granted');
        await this.setupNativeEnvironment();
        return true;
      } else {
        console.warn('⚠️ Native notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing native notifications:', error);
      return false;
    }
  }

  static async setupNativeEnvironment() {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Set up notification channels for Android
      if (Capacitor.getPlatform() === 'android') {
        await this.createNotificationChannels();
      }
      
      // Set up notification listeners
      await this.setupNotificationListeners();
      
      console.log('✅ Native notification environment setup complete');
    } catch (error) {
      console.error('❌ Error setting up native environment:', error);
    }
  }

  static async createNotificationChannels() {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('📱 Creating notification channels...');
      
      const channels = [
        {
          id: 'trading-signals',
          name: 'Trading Signals',
          description: 'Notifications for new trading signals',
          importance: 4 as const, // HIGH importance for sound
          sound: 'default'
        },
        {
          id: 'signal-alerts',
          name: 'Signal Alerts',
          description: 'Target hits and stop loss notifications',
          importance: 4 as const, // HIGH importance for sound
          sound: 'default'
        },
        {
          id: 'market-updates',
          name: 'Market Updates',
          description: 'Important market news and updates',
          importance: 3 as const, // MEDIUM importance
          sound: 'default'
        },
        {
          id: 'system-notifications',
          name: 'System Notifications',
          description: 'App updates and system messages',
          importance: 2 as const, // LOW importance
          sound: 'default'
        }
      ];

      for (const channel of channels) {
        try {
          await LocalNotifications.createChannel(channel);
          console.log(`✅ Created channel: ${channel.id}`);
        } catch (error) {
          console.warn(`⚠️ Could not create notification channel: ${channel.id}`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error creating notification channels:', error);
    }
  }

  static async setupNotificationListeners() {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Clear any existing listeners first
      await LocalNotifications.removeAllListeners();
      
      // Listen for notification received while app is in foreground
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('📱 Notification received in foreground:', notification);
      });

      // Listen for notification action performed (tap, etc.)
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('📱 Notification action performed:', notification);
      });

      console.log('✅ Notification listeners set up');
    } catch (error) {
      console.error('❌ Error setting up notification listeners:', error);
    }
  }

  static async showInstantSignalNotification(signal: SignalNotification) {
    try {
      // Check if we should use native notifications
      const hasNativeNotifications = await this.checkNativeNotificationSupport();
      
      if (hasNativeNotifications) {
        await this.showNativeNotification(signal, 'trading-signals');
      } else {
        this.showWebNotification(signal);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to toast
      toast(signal.title, {
        description: signal.body,
      });
    }
  }

  static async showNativeNotification(signal: SignalNotification, channelId: string = 'trading-signals') {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const notificationId = Date.now();
      console.log('📱 Showing native notification:', { id: notificationId, title: signal.title });
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: signal.title,
            body: signal.body,
            id: notificationId,
            sound: signal.sound || 'default',
            attachments: undefined,
            actionTypeId: 'FOREX_SIGNAL',
            extra: signal.data || {},
            channelId: channelId,
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#3B82F6',
            ongoing: false,
            autoCancel: true,
            summaryText: channelId === 'signal-alerts' ? 'Trading Alert' : 'Trading Signal'
          }
        ]
      });
      
      console.log('✅ Native notification sent:', signal.title);
    } catch (error) {
      console.error('❌ Error showing native notification:', error);
      throw new Error(`Failed to send native notification: ${(error as Error).message}`);
    }
  }

  static async showSignalOutcomeNotification(pair: string, outcome: 'profit' | 'loss', pips: number) {
    const isProfit = outcome === 'profit';
    const title = `${pair} Signal ${isProfit ? 'Profit' : 'Loss'}`;
    const body = `${isProfit ? '✅ Target hit!' : '❌ Stop loss hit'} ${Math.abs(pips)} pips`;

    const signal: SignalNotification = {
      title,
      body,
      data: { type: 'signal_outcome', pair, outcome, pips },
      sound: 'default',
      vibrate: true
    };

    try {
      const hasNativeNotifications = await this.checkNativeNotificationSupport();
      
      if (hasNativeNotifications) {
        await this.showNativeNotification(signal, 'signal-alerts');
      } else {
        this.showWebNotification(signal);
      }
    } catch (error) {
      console.error('Error showing outcome notification:', error);
      toast(title, { description: body });
    }
  }

  static showWebNotification(signal: SignalNotification) {
    if (!('Notification' in window)) {
      console.log('❌ Browser notifications not supported');
      throw new Error('Browser notifications are not supported on this device');
    }

    if (Notification.permission !== 'granted') {
      console.log('❌ Web notification permission not granted:', Notification.permission);
      throw new Error('Notification permissions not granted. Please enable notifications in your browser settings.');
    }

    try {
      console.log('🌐 Showing web notification:', signal.title);
      
      const notification = new Notification(signal.title, {
        body: signal.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'forex-signal',
        requireInteraction: true,
        silent: !signal.sound
      });

      notification.onclick = () => {
        console.log('🌐 Web notification clicked');
        window.focus();
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 8000);

      console.log('✅ Web notification shown');
    } catch (error) {
      console.error('❌ Could not show web notification:', error);
      throw new Error(`Failed to show web notification: ${(error as Error).message}`);
    }
  }

  static async testNotification() {
    console.log('🧪 Testing notification system...');
    
    try {
      const hasNativeNotifications = await this.checkNativeNotificationSupport();
      
      const testMessage = hasNativeNotifications ? 
        'Native mobile notification test with sound - you should hear this!' :
        'Web browser notification test - you should see this in your browser!';
      
      const testSignal: SignalNotification = {
        title: '🔊 Audio Test Notification',
        body: testMessage,
        data: { type: 'test' },
        sound: 'default',
        vibrate: true
      };

      if (hasNativeNotifications) {
        await this.showNativeNotification(testSignal, 'trading-signals');
      } else {
        this.showWebNotification(testSignal);
      }
      
      console.log('✅ Test notification sent successfully');
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      toast('Test Failed', { description: 'Could not send test notification' });
      throw error;
    }
  }
}
