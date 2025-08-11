
import { useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export const useMobileNotificationManager = () => {
  const { profile } = useProfile();
  const { createNotification } = useNotifications();
  const { toast } = useToast();
  const { user } = useAuth();

  const shouldSendNotification = useCallback((type: string): boolean => {
    if (!profile?.push_notifications_enabled) {
      console.log(`🔕 Notifications disabled for ${type}`);
      return false;
    }
    
    switch (type) {
      case 'new_signal':
        return profile.push_new_signals ?? true;
      case 'target_hit':
        return profile.push_targets_hit ?? true;
      case 'stop_loss':
        return profile.push_stop_loss ?? true;
      case 'signal_complete':
        return profile.push_signal_complete ?? true;
      case 'market_update':
        return profile.push_market_updates ?? false;
      default:
        return true;
    }
  }, [profile]);

  const triggerHaptics = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!profile?.push_vibration_enabled || !Capacitor.isNativePlatform()) return;

    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const impactStyle = type === 'light' ? ImpactStyle.Light : 
                         type === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium;
      await Haptics.impact({ style: impactStyle });
      console.log(`✅ Haptic feedback triggered: ${type}`);
    } catch (error) {
      console.warn('⚠️ Haptics not available:', error);
    }
  }, [profile?.push_vibration_enabled]);

  const sendPushNotification = useCallback(async (
    title: string,
    body: string,
    data?: any,
    notificationType: string = 'signal',
    userIds?: string[]
  ) => {
    try {
      console.log('📱 Sending push notification via backend...');
      
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          body,
          data,
          notificationType,
          userIds,
        }
      });

      if (error) {
        console.error('❌ Error sending push notification:', error);
        throw error;
      }

      console.log('✅ Push notification sent:', result);
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      throw error;
    }
  }, []);

  const sendNotificationSafely = useCallback(async (
    notificationFn: () => Promise<void>,
    fallbackTitle: string,
    fallbackMessage: string
  ) => {
    try {
      await notificationFn();
    } catch (error) {
      console.error('❌ Notification failed:', error);
      
      // Show toast as fallback
      toast({
        title: fallbackTitle,
        description: fallbackMessage,
        duration: 5000,
      });
      
      // Still create database notification for consistency
      if (user) {
        await createNotification(fallbackTitle, fallbackMessage, 'signal');
      }
    }
  }, [toast, createNotification, user]);

  const sendNewSignalNotification = useCallback(async (signal: any) => {
    if (!shouldSendNotification('new_signal') || !user) return;

    const title = `🚨 New ${signal.type} Signal`;
    const body = `${signal.symbol} - Entry: ${signal.price} | SL: ${signal.stop_loss}`;
    
    console.log('📱 Sending new signal notification:', { title, body, signalId: signal.id });
    
    // Create persistent notification in database first
    await createNotification(title, body, 'signal', { 
      signalId: signal.id, 
      type: 'new_signal',
      symbol: signal.symbol,
      signalType: signal.type,
      price: signal.price,
      stopLoss: signal.stop_loss
    });

    // Trigger haptics
    await triggerHaptics('heavy');

    // Send push notification with error handling
    await sendNotificationSafely(
      async () => {
        // Send backend push notification
        await sendPushNotification(
          title,
          body,
          { signalId: signal.id, type: 'new_signal', symbol: signal.symbol },
          'new_signal'
        );
        
        // Send local notification as backup
        await MobileNotificationManager.showInstantSignalNotification(
          title,
          body,
          { signalId: signal.id, type: 'new_signal' }
        );
      },
      title,
      body
    );
  }, [shouldSendNotification, createNotification, triggerHaptics, sendNotificationSafely, sendPushNotification, profile, user]);

  const sendTargetHitNotification = useCallback(async (signal: any, targetLevel: number, price: number) => {
    if (!shouldSendNotification('target_hit') || !user) return;

    const title = `🎯 Target ${targetLevel} Hit!`;
    const body = `${signal.symbol} ${signal.type} reached TP${targetLevel} at ${price.toFixed(5)}`;
    
    console.log('📱 Sending target hit notification:', { title, body, signalId: signal.id });
    
    await createNotification(title, body, 'success', { 
      signalId: signal.id, 
      type: 'target_hit', 
      targetLevel,
      symbol: signal.symbol,
      price: price.toFixed(5)
    });

    await triggerHaptics('medium');

    await sendNotificationSafely(
      async () => {
        // Send backend push notification
        await sendPushNotification(
          title,
          body,
          { signalId: signal.id, type: 'target_hit', targetLevel, price, symbol: signal.symbol },
          'target_hit'
        );
        
        // Send local notification as backup
        await MobileNotificationManager.showInstantSignalNotification(
          title,
          body,
          { signalId: signal.id, type: 'target_hit', targetLevel }
        );
      },
      title,
      body
    );
  }, [shouldSendNotification, createNotification, triggerHaptics, sendNotificationSafely, sendPushNotification, profile, user]);

  const sendStopLossNotification = useCallback(async (signal: any, price: number) => {
    if (!shouldSendNotification('stop_loss') || !user) return;

    const title = `⛔ Stop Loss Hit`;
    const body = `${signal.symbol} ${signal.type} stopped out at ${price.toFixed(5)}`;
    
    console.log('📱 Sending stop loss notification:', { title, body, signalId: signal.id });
    
    await createNotification(title, body, 'warning', { 
      signalId: signal.id, 
      type: 'stop_loss',
      symbol: signal.symbol,
      price: price.toFixed(5)
    });

    await triggerHaptics('heavy');

    await sendNotificationSafely(
      async () => {
        // Send backend push notification
        await sendPushNotification(
          title,
          body,
          { signalId: signal.id, type: 'stop_loss', price, symbol: signal.symbol },
          'stop_loss'
        );
        
        // Send local notification as backup
        await MobileNotificationManager.showInstantSignalNotification(
          title,
          body,
          { signalId: signal.id, type: 'stop_loss' }
        );
      },
      title,
      body
    );
  }, [shouldSendNotification, createNotification, triggerHaptics, sendNotificationSafely, sendPushNotification, profile, user]);

  const sendSignalCompleteNotification = useCallback(async (signal: any, outcome: 'profit' | 'loss', pips: number) => {
    if (!shouldSendNotification('signal_complete') || !user) return;

    const isProfit = outcome === 'profit';
    const title = `${isProfit ? '✅' : '❌'} Signal ${isProfit ? 'Completed' : 'Closed'}`;
    const body = `${signal.symbol} ${signal.type} - ${isProfit ? '+' : ''}${pips} pips`;
    
    console.log('📱 Sending signal complete notification:', { title, body, signalId: signal.id });
    
    await createNotification(title, body, isProfit ? 'success' : 'error', { 
      signalId: signal.id, 
      type: 'signal_complete', 
      outcome, 
      pips,
      symbol: signal.symbol
    });

    await triggerHaptics(isProfit ? 'light' : 'heavy');

    await sendNotificationSafely(
      () => MobileNotificationManager.showSignalOutcomeNotification(
        title,
        body,
        { outcome, pips: Math.abs(pips) }
      ),
      title,
      body
    );
  }, [shouldSendNotification, createNotification, triggerHaptics, sendNotificationSafely, user]);

  const sendMarketUpdateNotification = useCallback(async (title: string, message: string, data?: any) => {
    if (!shouldSendNotification('market_update') || !user) return;

    console.log('📱 Sending market update notification:', { title, message });

    await createNotification(title, message, 'info', { 
      type: 'market_update',
      ...data
    });

    await sendNotificationSafely(
      () => MobileNotificationManager.showInstantSignalNotification(
        title,
        message,
        { type: 'market_update', ...data }
      ),
      title,
      message
    );
  }, [shouldSendNotification, createNotification, sendNotificationSafely, profile, user]);

  const sendTestNotification = useCallback(async () => {
    console.log('📱 Sending test notification...');
    
    try {
      // Send backend push notification first
      await sendPushNotification(
        '🧪 Test Notification',
        'Your push notification system is working correctly!',
        { test: true },
        'signal',
        user ? [user.id] : undefined
      );
      
      // Send local notification as backup
      await MobileNotificationManager.testNotification();
      await triggerHaptics('medium');
      
      toast({
        title: '🧪 Test notification sent',
        description: 'Check if you received the push notification',
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      toast({
        title: 'Test failed',
        description: `Could not send test notification: ${(error as Error).message}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [sendPushNotification, triggerHaptics, toast, user]);

  return {
    sendNewSignalNotification,
    sendTargetHitNotification,
    sendStopLossNotification,
    sendSignalCompleteNotification,
    sendMarketUpdateNotification,
    sendTestNotification,
    shouldSendNotification
  };
};
