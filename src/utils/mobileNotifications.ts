
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
    if (!Capacitor.isNativePlatform()) return;

    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        console.log('Local notifications permission granted');
        return true;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
    return false;
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
            actionTypeId: 'TRADING_SIGNAL',
            extra: signal.data
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  static async showInstantNotification(signal: SignalNotification) {
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
            actionTypeId: 'TRADING_SIGNAL',
            extra: signal.data
          }
        ]
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  static async clearAllNotifications() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.removeAllDeliveredNotifications();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}
