
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface SignalNotification {
  title: string;
  body: string;
  data?: any;
  scheduled?: Date;
}

export class MobileNotificationManager {
  static async initialize() {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        console.log('📱 ForexSignal Pro notification permissions granted');
        
        // Set up notification channels for Android
        if (Capacitor.getPlatform() === 'android') {
          await this.createNotificationChannels();
        }
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
    }
    return false;
  }

  static async createNotificationChannels() {
    // Create channels for different types of notifications
    const channels = [
      {
        id: 'forex_signals',
        name: 'Forex Trading Signals',
        description: 'New forex trading signals and updates',
        importance: 5,
        visibility: 1
      },
      {
        id: 'signal_outcomes',
        name: 'Signal Outcomes',
        description: 'Stop loss and take profit notifications',
        importance: 4,
        visibility: 1
      },
      {
        id: 'market_alerts',
        name: 'Market Alerts',
        description: 'Important market updates and news',
        importance: 3,
        visibility: 1
      }
    ];

    for (const channel of channels) {
      try {
        await LocalNotifications.createChannel(channel as any);
      } catch (error) {
        console.warn('Could not create notification channel:', channel.id);
      }
    }
  }

  static async scheduleSignalAlert(signal: SignalNotification, delay: number = 0) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const notificationTime = new Date(Date.now() + delay);
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: signal.title,
            body: signal.body,
            id: Date.now(),
            schedule: { at: notificationTime },
            sound: 'default',
            attachments: undefined,
            actionTypeId: 'FOREX_SIGNAL',
            extra: signal.data,
            channelId: 'forex_signals',
            smallIcon: 'ic_stat_forex',
            iconColor: '#10b981'
          }
        ]
      });
      
      console.log('📱 Forex signal notification scheduled:', signal.title);
    } catch (error) {
      console.error('❌ Error scheduling signal notification:', error);
    }
  }

  static async showInstantSignalNotification(signal: SignalNotification) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: signal.title,
            body: signal.body,
            id: Date.now(),
            sound: 'default',
            attachments: undefined,
            actionTypeId: 'FOREX_SIGNAL',
            extra: signal.data,
            channelId: 'forex_signals',
            smallIcon: 'ic_stat_forex',
            iconColor: '#10b981'
          }
        ]
      });
      
      console.log('📱 Instant forex signal notification sent:', signal.title);
    } catch (error) {
      console.error('❌ Error showing instant notification:', error);
    }
  }

  static async showSignalOutcomeNotification(pair: string, outcome: 'profit' | 'loss', pips: number) {
    if (!Capacitor.isNativePlatform()) return;

    const isProfit = outcome === 'profit';
    const title = `${pair} Signal ${isProfit ? 'Profit' : 'Loss'}`;
    const body = `${isProfit ? '✅ Target hit!' : '❌ Stop loss hit'} ${Math.abs(pips)} pips`;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            sound: 'default',
            channelId: 'signal_outcomes',
            smallIcon: 'ic_stat_forex',
            iconColor: isProfit ? '#10b981' : '#ef4444'
          }
        ]
      });
      
      console.log('📱 Signal outcome notification sent:', title);
    } catch (error) {
      console.error('❌ Error showing outcome notification:', error);
    }
  }

  static async clearAllNotifications() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.removeAllDeliveredNotifications();
      console.log('📱 All notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }
}
