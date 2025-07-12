
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNotificationManager } from './useMobileNotificationManager';
import { useNotifications } from './useNotifications';

export const useSignalNotifications = () => {
  const { user } = useAuth();
  const { 
    sendNewSignalNotification,
    sendTargetHitNotification,
    sendStopLossNotification,
    sendSignalCompleteNotification,
    sendMarketUpdateNotification
  } = useMobileNotificationManager();
  const { createNotification } = useNotifications();

  // Listen for new trading signals
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up signal notification listeners...');

    const signalsChannel = supabase
      .channel('trading-signals-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        async (payload) => {
          const signal = payload.new;
          console.log('🚨 New signal detected for notifications:', signal);
          
          // Send notification for new signal
          await sendNewSignalNotification(signal);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        async (payload) => {
          const signal = payload.new;
          const oldSignal = payload.old;
          
          // Check if new targets were hit
          const oldTargetsHit = oldSignal.targets_hit || [];
          const newTargetsHit = signal.targets_hit || [];
          
          if (newTargetsHit.length > oldTargetsHit.length) {
            const latestTarget = Math.max(...newTargetsHit);
            const targetPrice = signal.take_profits?.[latestTarget - 1];
            
            if (targetPrice) {
              console.log(`🎯 Target ${latestTarget} hit for ${signal.symbol}`);
              await sendTargetHitNotification(signal, latestTarget, targetPrice);
            }
          }
          
          // Check if status changed to expired (signal completed)
          if (oldSignal.status === 'active' && signal.status === 'expired') {
            console.log(`📊 Signal ${signal.symbol} completed/expired`);
            
            // Check for signal outcome to determine profit/loss
            const { data: outcome } = await supabase
              .from('signal_outcomes')
              .select('*')
              .eq('signal_id', signal.id)
              .single();
            
            if (outcome) {
              const pips = outcome.pnl_pips || 0;
              const result = outcome.hit_target ? 'profit' : 'loss';
              await sendSignalCompleteNotification(signal, result, pips);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up signal notification listeners');
      supabase.removeChannel(signalsChannel);
    };
  }, [user, sendNewSignalNotification, sendTargetHitNotification, sendStopLossNotification, sendSignalCompleteNotification]);

  // Listen for signal outcomes directly
  useEffect(() => {
    if (!user) return;

    const outcomesChannel = supabase
      .channel('signal-outcomes-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        async (payload) => {
          const outcome = payload.new;
          console.log('📈 Signal outcome detected:', outcome);
          
          // Get the signal details
          const { data: signal } = await supabase
            .from('trading_signals')
            .select('*')
            .eq('id', outcome.signal_id)
            .single();
          
          if (signal) {
            const pips = outcome.pnl_pips || 0;
            const result = outcome.hit_target ? 'profit' : 'loss';
            
            if (outcome.notes?.includes('Stop Loss Hit')) {
              await sendStopLossNotification(signal, outcome.exit_price);
            } else {
              await sendSignalCompleteNotification(signal, result, pips);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(outcomesChannel);
    };
  }, [user, sendStopLossNotification, sendSignalCompleteNotification]);

  // Listen for market updates
  useEffect(() => {
    if (!user) return;

    const marketChannel = supabase
      .channel('market-updates-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'economic_events',
          filter: 'impact_level=eq.high'
        },
        async (payload) => {
          const event = payload.new;
          console.log('📰 High-impact economic event:', event);
          
          await sendMarketUpdateNotification(
            `📰 ${event.currency} Economic Event`,
            `${event.title} - Impact: ${event.impact_level}`,
            { 
              eventId: event.id,
              currency: event.currency,
              impact: event.impact_level
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(marketChannel);
    };
  }, [user, sendMarketUpdateNotification]);

  // Create system notifications for important events
  const createSystemNotification = useCallback(async (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    data?: any
  ) => {
    await createNotification(title, message, type, data);
  }, [createNotification]);

  return {
    createSystemNotification
  };
};
