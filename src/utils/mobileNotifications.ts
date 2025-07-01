
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
  static async initialize(): Promise<boolean> {
    console.log('📱 Initializing MobileNotificationManager...');
    
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Native platform detected - using LocalNotifications');
      return await this.initializeMobileNotifications();
    } else {
      console.log('🌐 Web platform detected - using browser notifications');
      return await this.initializeWebNotifications();
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

    // Request permission
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

  static async initializeMobileNotifications(): Promise<boolean> {
    try {
      // Import LocalNotifications dynamically to handle cases where it's not available
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('📱 LocalNotifications plugin imported successfully');
      
      console.log('📱 Requesting mobile notification permissions...');
      const permission = await LocalNotifications.requestPermissions();
      console.log('📱 Mobile permission result:', permission);
      
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
      console.error('❌ This usually means LocalNotifications plugin is not installed or not available');
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
    if (!Capacitor.isNativePlatform()) {
      return this.showWebNotification(signal);
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const notificationId = Date.now();
      console.log('📱 Showing instant mobile notification:', { id: notificationId, title: signal.title });
      
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
      
      console.log('✅ Mobile notification sent:', signal.title);
    } catch (error) {
      console.error('❌ Error showing mobile notification:', error);
      throw new Error(`Failed to send mobile notification: ${(error as Error).message}`);
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
      throw new Error(`Failed to send outcome notification: ${(error as Error).message}`);
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
        silent: signal.sound === false
      });

      notification.onclick = () => {
        console.log('🌐 Web notification clicked');
        window.focus();
        notification.close();
      };

      // Auto-close after 8 seconds
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
      const testMessage = Capacitor.isNativePlatform() ? 
        'Native mobile notification test - you should see this on your device!' :
        'Web browser notification test - you should see this in your browser!';
      
      await this.showInstantSignalNotification({
        title: '🧪 Test Notification',
        body: testMessage,
        data: { type: 'test' },
        sound: true,
        vibrate: true
      });
      
      console.log('✅ Test notification sent successfully');
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      throw error;
    }
  }
}
