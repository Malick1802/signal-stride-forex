
import { Capacitor } from '@capacitor/core';

interface SignalNotification {
  title: string;
  body: string;
  data?: any;
  scheduled?: Date;
  sound?: boolean;
  vibrate?: boolean;
}

export class MobileNotificationManager {
  static async initialize() {
    console.log('📱 Initializing MobileNotificationManager...');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - using browser notifications if available');
      return await this.requestWebNotificationPermission();
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('📱 Requesting local notification permissions...');
      
      const permission = await LocalNotifications.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.display === 'granted') {
        console.log('✅ Mobile notification permissions granted');
        
        // Set up notification channels for Android
        if (Capacitor.getPlatform() === 'android') {
          await this.createNotificationChannels();
        }
        
        // Set up notification listeners
        await this.setupNotificationListeners();
        
        return true;
      } else {
        console.warn('⚠️ Mobile notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing mobile notifications:', error);
      return false;
    }
  }

  static async createNotificationChannels() {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('📱 Creating notification channels...');
      
      const channels = [
        {
          id: 'forex_signals',
          name: 'Forex Trading Signals',
          description: 'New forex trading signals and updates',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true
        },
        {
          id: 'signal_outcomes',
          name: 'Signal Outcomes',
          description: 'Stop loss and take profit notifications',
          importance: 4,
          visibility: 1,
          sound: 'default',
          vibration: true
        },
        {
          id: 'market_alerts',
          name: 'Market Alerts',
          description: 'Important market updates and news',
          importance: 3,
          visibility: 1,
          sound: 'default',
          vibration: false
        }
      ];

      for (const channel of channels) {
        try {
          await LocalNotifications.createChannel(channel as any);
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
      
      // Listen for notification received while app is in foreground
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('📱 Notification received in foreground:', notification);
      });

      // Listen for notification action performed (tap, etc.)
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('📱 Notification action performed:', notification);
        // Handle notification tap - could navigate to specific screen
      });

      console.log('✅ Notification listeners set up');
    } catch (error) {
      console.error('❌ Error setting up notification listeners:', error);
    }
  }

  static async scheduleSignalAlert(signal: SignalNotification, delay: number = 0) {
    if (!Capacitor.isNativePlatform()) {
      return this.showWebNotification(signal);
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const notificationTime = new Date(Date.now() + delay);
      
      const notificationId = Date.now();
      console.log('📱 Scheduling notification:', { id: notificationId, title: signal.title });
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: signal.title,
            body: signal.body,
            id: notificationId,
            schedule: { at: notificationTime },
            sound: signal.sound !== false ? 'default' : undefined,
            attachments: undefined,
            actionTypeId: 'FOREX_SIGNAL',
            extra: signal.data,
            channelId: 'forex_signals',
            smallIcon: 'ic_stat_notification',
            iconColor: '#10b981'
          }
        ]
      });
      
      console.log('✅ Forex signal notification scheduled:', signal.title);
    } catch (error) {
      console.error('❌ Error scheduling signal notification:', error);
    }
  }

  static async showInstantSignalNotification(signal: SignalNotification) {
    if (!Capacitor.isNativePlatform()) {
      return this.showWebNotification(signal);
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const notificationId = Date.now();
      console.log('📱 Showing instant notification:', { id: notificationId, title: signal.title });
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: signal.title,
            body: signal.body,
            id: notificationId,
            sound: signal.sound !== false ? 'default' : undefined,
            attachments: undefined,
            actionTypeId: 'FOREX_SIGNAL',
            extra: signal.data,
            channelId: 'forex_signals',
            smallIcon: 'ic_stat_notification',
            iconColor: '#10b981'
          }
        ]
      });
      
      console.log('✅ Instant forex signal notification sent:', signal.title);
    } catch (error) {
      console.error('❌ Error showing instant notification:', error);
    }
  }

  static async showSignalOutcomeNotification(pair: string, outcome: 'profit' | 'loss', pips: number) {
    const isProfit = outcome === 'profit';
    const title = `${pair} Signal ${isProfit ? 'Profit' : 'Loss'}`;
    const body = `${isProfit ? '✅ Target hit!' : '❌ Stop loss hit'} ${Math.abs(pips)} pips`;

    if (!Capacitor.isNativePlatform()) {
      return this.showWebNotification({ title, body });
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const notificationId = Date.now();
      console.log('📱 Showing outcome notification:', { id: notificationId, title, outcome });
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notificationId,
            sound: 'default',
            channelId: 'signal_outcomes',
            smallIcon: 'ic_stat_notification',
            iconColor: isProfit ? '#10b981' : '#ef4444'
          }
        ]
      });
      
      console.log('✅ Signal outcome notification sent:', title);
    } catch (error) {
      console.error('❌ Error showing outcome notification:', error);
    }
  }

  static async clearAllNotifications() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.removeAllDeliveredNotifications();
      console.log('📱 All notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  static async requestWebNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('🌐 Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Web notifications already granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      console.log('🌐 Web notification permission:', permission);
      return permission === 'granted';
    }

    console.log('❌ Web notifications denied');
    return false;
  }

  static showWebNotification(signal: SignalNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        console.log('🌐 Showing web notification:', signal.title);
        const notification = new Notification(signal.title, {
          body: signal.body,
          icon: '/favicon.ico',
          tag: 'forex-signal',
          requireInteraction: true
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        console.log('✅ Web notification shown');
      } catch (error) {
        console.warn('⚠️ Could not show web notification:', error);
      }
    } else {
      console.log('🌐 Web notifications not available or not permitted');
    }
  }

  // Test notification function
  static async testNotification() {
    console.log('🧪 Testing notification system...');
    
    await this.showInstantSignalNotification({
      title: '🧪 Test Notification',
      body: 'This is a test to verify notifications are working',
      data: { type: 'test' },
      sound: true,
      vibrate: true
    });
  }
}
