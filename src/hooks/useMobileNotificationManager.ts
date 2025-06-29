
import { useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileNotificationManager = () => {
  const { profile } = useProfile();
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

  const createUserNotification = useCallback(async (title: string, message: string, type: string, data?: any) => {
    if (!user) return;

    try {
      // Use raw SQL query to insert notification
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          INSERT INTO user_notifications (user_id, title, message, type, data)
          VALUES ($1, $2, $3, $4, $5)
        `,
        params: [user.id, title, message, type, JSON.stringify(data || {})]
      });

      if (error) {
        console.error('Error creating user notification:', error);
      }
    } catch (error) {
      console.error('Error creating user notification:', error);
    }
  }, [user]);

  const triggerHaptics = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!profile?.push_vibration_enabled) return;

    try {
      const impactStyle = type === 'light' ? ImpactStyle.Light : 
                         type === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium;
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }, [profile?.push_vibration_enabled]);

  const sendNewSignalNotification = useCallback(async (signal: any) => {
    if (!shouldSendNotification('new_signal')) return;

    const title = `🚨 New ${signal.type} Signal`;
    const body = `${signal.symbol} - Entry: ${signal.price} | SL: ${signal.stop_loss}`;
    
    // Create persistent notification
    await createUserNotification(title, body, 'signal', { signalId: signal.id, type: 'new_signal' });

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
  }, [shouldSendNotification, toast, createUserNotification, triggerHaptics, profile]);

  const sendTargetHitNotification = useCallback(async (signal: any, targetLevel: number, price: number) => {
    if (!shouldSendNotification('target_hit')) return;

    const title = `🎯 Target ${targetLevel} Hit!`;
    const body = `${signal.symbol} ${signal.type} reached TP${targetLevel} at ${price.toFixed(5)}`;
    
    // Create persistent notification
    await createUserNotification(title, body, 'success', { signalId: signal.id, type: 'target_hit', targetLevel });

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
  }, [shouldSendNotification, toast, createUserNotification, triggerHaptics, profile]);

  const sendStopLossNotification = useCallback(async (signal: any, price: number) => {
    if (!shouldSendNotification('stop_loss')) return;

    const title = `⛔ Stop Loss Hit`;
    const body = `${signal.symbol} ${signal.type} stopped out at ${price.toFixed(5)}`;
    
    // Create persistent notification
    await createUserNotification(title, body, 'warning', { signalId: signal.id, type: 'stop_loss' });

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
  }, [shouldSendNotification, toast, createUserNotification, triggerHaptics, profile]);

  const sendSignalCompleteNotification = useCallback(async (signal: any, outcome: 'profit' | 'loss', pips: number) => {
    if (!shouldSendNotification('signal_complete')) return;

    const isProfit = outcome === 'profit';
    const title = `${isProfit ? '✅' : '❌'} Signal ${isProfit ? 'Completed' : 'Closed'}`;
    const body = `${signal.symbol} ${signal.type} - ${isProfit ? '+' : ''}${pips} pips`;
    
    // Create persistent notification
    await createUserNotification(title, body, isProfit ? 'success' : 'error', { 
      signalId: signal.id, 
      type: 'signal_complete', 
      outcome, 
      pips 
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
  }, [shouldSendNotification, toast, createUserNotification, triggerHaptics]);

  return {
    sendNewSignalNotification,
    sendTargetHitNotification,
    sendStopLossNotification,
    sendSignalCompleteNotification,
    shouldSendNotification
  };
};
