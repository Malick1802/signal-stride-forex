// Monitor-only hook - NO EXPIRATION LOGIC
// This hook only monitors signal status and provides notifications
// All expiration is handled server-side by database triggers

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { supabase } from '@/integrations/supabase/client';
import Logger from '@/utils/logger';

export const useMonitorOnlySignals = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendTargetHitSMS, sendStopLossSMS, sendSignalCompleteSMS } = useSMSNotifications();
  const { 
    sendNewSignalNotification, 
    sendTargetHitNotification, 
    sendStopLossNotification, 
    sendSignalCompleteNotification 
  } = useMobileNotificationManager();

  useEffect(() => {
    if (!user) return;

    Logger.info('monitoring', 'Setting up server-side signal monitoring...');

    // Subscribe to signal status changes for notifications only
    const signalChannel = supabase
      .channel('signal_status_monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trading_signals',
          filter: `status=eq.expired`
        },
        async (payload) => {
          Logger.info('monitoring', 'Signal expired by server:', payload.new);
          
          // Send notifications for server-side expiration
          if (payload.new.expire_reason === 'stop_loss_hit') {
            toast({
              title: "Stop Loss Hit",
              description: `Signal ${payload.new.symbol} stopped out`,
              variant: "destructive",
            });
            
            // Send notifications
            await sendStopLossSMS(payload.new.symbol, payload.new.current_pips || 0);
            await sendStopLossNotification(payload.new.symbol, payload.new.current_pips || 0);
          } else if (payload.new.expire_reason === 'all_take_profits_hit') {
            toast({
              title: "All Targets Hit!",
              description: `Signal ${payload.new.symbol} completed successfully`,
            });
            
            // Send notifications
            await sendSignalCompleteSMS(payload.new.symbol, payload.new.current_pips || 0);
            await sendSignalCompleteNotification(payload.new.symbol, payload.new.current_pips || 0, payload.new.take_profits?.length || 0);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        async (payload) => {
          Logger.info('monitoring', 'Signal outcome created:', payload.new);
          // Additional outcome-based notifications if needed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalChannel);
      Logger.info('monitoring', 'Cleaned up server-side signal monitoring');
    };
  }, [user, toast, sendTargetHitSMS, sendStopLossSMS, sendSignalCompleteSMS, sendNewSignalNotification, sendTargetHitNotification, sendStopLossNotification, sendSignalCompleteNotification]);

  return {
    // Return monitoring status only - no expiration functions
    isMonitoring: !!user
  };
};