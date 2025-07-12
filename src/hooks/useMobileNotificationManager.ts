
import { useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

export const useMobileNotificationManager = () => {
  const { profile } = useProfile();
  const { createNotification } = useNotifications();
  const { toast } = useToast();
  const { user } = useAuth();

  const shouldSendNotification = useCallback((type: string): boolean => {
    if (!profile?.push_notifications_enabled) return false;
    
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

  const sendNewSignalNotification = useCallback(async (signal: any) => {
    if (!shouldSendNotification('new_signal') || !user) return;

    const title = `🚨 New ${signal.type} Signal`;
    const body = `${signal.symbol} - Entry: ${signal.price} | SL: ${signal.stop_loss}`;
    
    console.log('📱 Sending new signal notification:', { title, body, signalId: signal.id });
    
    // Create persistent notification in database
    await createNotification(title, body, 'signal', { 
      signalId: signal.id, 
      type: 'new_signal',
      symbol: signal.symbol,
      signalType: signal.type,
      price: signal.price,
      stopLoss: signal.stop_loss
    });

    // Trigger haptics if enabled
    await triggerHaptics('heavy');

    // Show mobile notification with sound/vibration based on settings
    await MobileNotificationManager.showInstantSignalNotification({
      title,
      body,
      data: { signalId: signal.id, type: 'new_signal' },
      sound: profile?.push_sound_enabled !== false,
      vibrate: profile?.push_vibration_enabled !== false
    });

    // Show toast notification for immediate feedback
    toast({
      title,
      description: body,
      duration: 5000,
    });
  }, [shouldSendNotification, toast, createNotification, triggerHaptics, profile, user]);

  const sendTargetHitNotification = useCallback(async (signal: any, targetLevel: number, price: number) => {
    if (!shouldSendNotification('target_hit') || !user) return;

    const title = `🎯 Target ${targetLevel} Hit!`;
    const body = `${signal.symbol} ${signal.type} reached TP${targetLevel} at ${price.toFixed(5)}`;
    
    console.log('📱 Sending target hit notification:', { title, body, signalId: signal.id });
    
    // Create persistent notification in database
    await createNotification(title, body, 'success', { 
      signalId: signal.id, 
      type: 'target_hit', 
      targetLevel,
      symbol: signal.symbol,
      price: price.toFixed(5)
    });

    // Trigger haptics
    await triggerHaptics('medium');

    await MobileNotificationManager.showInstantSignalNotification({
      title,
      body,
      data: { signalId: signal.id, type: 'target_hit', targetLevel },
      sound: profile?.push_sound_enabled !== false,
      vibrate: profile?.push_vibration_enabled !== false
    });

    toast({
      title,
      description: body,
      duration: 6000,
    });
  }, [shouldSendNotification, toast, createNotification, triggerHaptics, profile, user]);

  const sendStopLossNotification = useCallback(async (signal: any, price: number) => {
    if (!shouldSendNotification('stop_loss') || !user) return;

    const title = `⛔ Stop Loss Hit`;
    const body = `${signal.symbol} ${signal.type} stopped out at ${price.toFixed(5)}`;
    
    console.log('📱 Sending stop loss notification:', { title, body, signalId: signal.id });
    
    // Create persistent notification in database
    await createNotification(title, body, 'warning', { 
      signalId: signal.id, 
      type: 'stop_loss',
      symbol: signal.symbol,
      price: price.toFixed(5)
    });

    // Trigger haptics
    await triggerHaptics('heavy');

    await MobileNotificationManager.showInstantSignalNotification({
      title,
      body,
      data: { signalId: signal.id, type: 'stop_loss' },
      sound: profile?.push_sound_enabled !== false,
      vibrate: profile?.push_vibration_enabled !== false
    });

    toast({
      title,
      description: body,
      duration: 6000,
    });
  }, [shouldSendNotification, toast, createNotification, triggerHaptics, profile, user]);

  const sendSignalCompleteNotification = useCallback(async (signal: any, outcome: 'profit' | 'loss', pips: number) => {
    if (!shouldSendNotification('signal_complete') || !user) return;

    const isProfit = outcome === 'profit';
    const title = `${isProfit ? '✅' : '❌'} Signal ${isProfit ? 'Completed' : 'Closed'}`;
    const body = `${signal.symbol} ${signal.type} - ${isProfit ? '+' : ''}${pips} pips`;
    
    console.log('📱 Sending signal complete notification:', { title, body, signalId: signal.id });
    
    // Create persistent notification in database
    await createNotification(title, body, isProfit ? 'success' : 'error', { 
      signalId: signal.id, 
      type: 'signal_complete', 
      outcome, 
      pips,
      symbol: signal.symbol
    });

    // Trigger haptics
    await triggerHaptics(isProfit ? 'light' : 'heavy');

    await MobileNotificationManager.showSignalOutcomeNotification(
      signal.symbol,
      outcome,
      Math.abs(pips)
    );

    toast({
      title,
      description: body,
      duration: 8000,
    });
  }, [shouldSendNotification, toast, createNotification, triggerHaptics, user]);

  const sendMarketUpdateNotification = useCallback(async (title: string, message: string, data?: any) => {
    if (!shouldSendNotification('market_update') || !user) return;

    console.log('📱 Sending market update notification:', { title, message });

    // Create persistent notification in database
    await createNotification(title, message, 'info', { 
      type: 'market_update',
      ...data
    });

    // Show mobile notification
    await MobileNotificationManager.showInstantSignalNotification({
      title,
      body: message,
      data: { type: 'market_update', ...data },
      sound: profile?.push_sound_enabled !== false,
      vibrate: profile?.push_vibration_enabled !== false
    });

    toast({
      title,
      description: message,
      duration: 4000,
    });
  }, [shouldSendNotification, toast, createNotification, profile, user]);

  // Test notification function
  const sendTestNotification = useCallback(async () => {
    console.log('📱 Sending test notification...');
    
    await MobileNotificationManager.showInstantSignalNotification({
      title: '🧪 Test Notification',
      body: 'This is a test notification to verify the system is working',
      data: { type: 'test' },
      sound: profile?.push_sound_enabled !== false,
      vibrate: profile?.push_vibration_enabled !== false
    });

    await triggerHaptics('medium');

    toast({
      title: '🧪 Test Notification Sent',
      description: 'Check if you received the notification',
      duration: 3000,
    });
  }, [profile, triggerHaptics, toast]);

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
