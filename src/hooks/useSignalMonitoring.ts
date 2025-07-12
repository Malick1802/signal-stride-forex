import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSMSNotifications } from './useSMSNotifications';
import { useMobileNotificationManager } from './useMobileNotificationManager';
import { useAuth } from '@/contexts/AuthContext';

interface SignalToMonitor {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  status: string;
  createdAt: string;
  targetsHit: number[];
  confidence?: number;
}

export const useSignalMonitoring = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendTargetHitSMS, sendStopLossSMS, sendSignalCompleteSMS } = useSMSNotifications();
  const { 
    sendNewSignalNotification, 
    sendTargetHitNotification, 
    sendStopLossNotification, 
    sendSignalCompleteNotification 
  } = useMobileNotificationManager();

  const getUserProfile = useCallback(async () => {
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, sms_notifications_enabled, sms_verified')
      .eq('id', user.id)
      .single();
    
    return profile;
  }, [user]);

  const createSignalOutcome = useCallback(async (
    signalId: string,
    isSuccessful: boolean,
    exitPrice: number,
    targetsHit: number[],
    pnlPips: number,
    notes: string
  ) => {
    try {
      // Check if outcome already exists
      const { data: existingOutcome } = await supabase
        .from('signal_outcomes')
        .select('id')
        .eq('signal_id', signalId)
        .single();

      if (existingOutcome) {
        console.log(`Outcome already exists for signal ${signalId}`);
        return true;
      }

      // Create outcome record
      const { error: outcomeError } = await supabase
        .from('signal_outcomes')
        .insert({
          signal_id: signalId,
          hit_target: isSuccessful,
          exit_price: exitPrice,
          exit_timestamp: new Date().toISOString(),
          target_hit_level: targetsHit.length > 0 ? Math.max(...targetsHit) : null,
          pnl_pips: pnlPips,
          notes: notes
        });

      if (outcomeError) {
        console.error('Error creating signal outcome:', outcomeError);
        return false;
      }

      // Expire the signal
      const { error: updateError } = await supabase
        .from('trading_signals')
        .update({ 
          status: 'expired',
          targets_hit: targetsHit,
          updated_at: new Date().toISOString()
        })
        .eq('id', signalId);

      if (updateError) {
        console.error('Error expiring signal:', updateError);
        return false;
      }

      console.log(`✅ Signal ${signalId} expired with outcome: ${notes} (${pnlPips} pips)`);
      return true;
    } catch (error) {
      console.error('Error in createSignalOutcome:', error);
      return false;
    }
  }, []);

  const checkSignalOutcomes = useCallback(async (signals: SignalToMonitor[], currentPrices: Record<string, number>) => {
    const userProfile = await getUserProfile();
    
    for (const signal of signals) {
      if (signal.status !== 'active') continue;
      
      const currentPrice = currentPrices[signal.symbol];
      if (!currentPrice) continue;

      console.log(`📊 Monitoring ${signal.symbol}: Current ${currentPrice}, Entry ${signal.entryPrice}, SL ${signal.stopLoss}`);

      let hitStopLoss = false;
      let newTargetsHit = [...signal.targetsHit];
      let hasNewTargetHit = false;
      let shouldExpire = false;

      // Check stop loss hit
      if (signal.type === 'BUY') {
        hitStopLoss = currentPrice <= signal.stopLoss;
      } else {
        hitStopLoss = currentPrice >= signal.stopLoss;
      }

      // Check take profit hits
      if (!hitStopLoss && signal.takeProfits.length > 0) {
        for (let i = 0; i < signal.takeProfits.length; i++) {
          const tpPrice = signal.takeProfits[i];
          const targetNumber = i + 1;
          let tpHit = false;
          
          if (signal.type === 'BUY') {
            tpHit = currentPrice >= tpPrice;
          } else {
            tpHit = currentPrice <= tpPrice;
          }
          
          if (tpHit && !newTargetsHit.includes(targetNumber)) {
            newTargetsHit.push(targetNumber);
            hasNewTargetHit = true;
            console.log(`🎯 Target ${targetNumber} hit for ${signal.symbol}!`);
            
            // Send mobile notification
            await sendTargetHitNotification(signal, targetNumber, tpPrice);

            // Send SMS notification for target hit
            if (userProfile?.phone_number && userProfile.sms_notifications_enabled && userProfile.sms_verified) {
              const pnlPips = signal.type === 'BUY' 
                ? Math.round((tpPrice - signal.entryPrice) * 10000)
                : Math.round((signal.entryPrice - tpPrice) * 10000);
              
              await sendTargetHitSMS(userProfile.phone_number, {
                symbol: signal.symbol,
                type: signal.type,
                price: tpPrice,
                targetLevel: targetNumber,
                pnlPips
              });
            }
          }
        }
      }

      // Update targets if new ones hit
      if (hasNewTargetHit) {
        try {
          const { error: updateError } = await supabase
            .from('trading_signals')
            .update({ 
              targets_hit: newTargetsHit,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (updateError) {
            console.error('Error updating targets_hit:', updateError);
          }
        } catch (error) {
          console.error('Error updating signal targets:', error);
        }
      }

      // Check if signal should expire immediately
      const allTargetsHit = newTargetsHit.length === signal.takeProfits.length;
      shouldExpire = hitStopLoss || allTargetsHit;

      if (shouldExpire) {
        // Calculate final outcome
        let finalExitPrice = currentPrice;
        let isSuccessful = allTargetsHit;
        let finalNotes = '';
        
        if (allTargetsHit) {
          const highestHitTarget = Math.max(...newTargetsHit);
          finalExitPrice = signal.takeProfits[highestHitTarget - 1];
          finalNotes = `All Take Profits Hit - Target ${highestHitTarget}`;
        } else if (hitStopLoss) {
          finalExitPrice = signal.stopLoss;
          isSuccessful = false;
          finalNotes = 'Stop Loss Hit';
        }
        
        // Calculate P&L
        let pnlPips = 0;
        if (signal.type === 'BUY') {
          pnlPips = Math.round((finalExitPrice - signal.entryPrice) * 10000);
        } else {
          pnlPips = Math.round((signal.entryPrice - finalExitPrice) * 10000);
        }

        // Create outcome and expire signal immediately
        const success = await createSignalOutcome(
          signal.id,
          isSuccessful,
          finalExitPrice,
          newTargetsHit,
          pnlPips,
          finalNotes
        );

        if (success) {
          // Send mobile notification
          await sendSignalCompleteNotification(
            signal,
            isSuccessful ? 'profit' : 'loss',
            pnlPips
          );

          // Send SMS notification
          if (userProfile?.phone_number && userProfile.sms_notifications_enabled && userProfile.sms_verified) {
            if (isSuccessful) {
              await sendSignalCompleteSMS(userProfile.phone_number, {
                symbol: signal.symbol,
                type: signal.type,
                pnlPips
              });
            } else {
              await sendStopLossSMS(userProfile.phone_number, {
                symbol: signal.symbol,
                type: signal.type,
                price: finalExitPrice,
                pnlPips
              });
            }
          }
        }
      }
    }
  }, [toast, getUserProfile, sendTargetHitSMS, sendStopLossSMS, sendSignalCompleteSMS, createSignalOutcome, sendTargetHitNotification, sendStopLossNotification, sendSignalCompleteNotification]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals only
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        return;
      }

      console.log(`🔍 Monitoring ${activeSignals.length} active signals...`);

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        console.log('⚠️ No market data available for signal monitoring');
        return;
      }

      // Create price lookup
      const currentPrices: Record<string, number> = {};
      marketData.forEach(data => {
        currentPrices[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Transform signals for monitoring
      const signalsToMonitor: SignalToMonitor[] = activeSignals.map(signal => ({
        id: signal.id,
        symbol: signal.symbol,
        type: (signal.type === 'BUY' || signal.type === 'SELL') ? signal.type as 'BUY' | 'SELL' : 'BUY',
        entryPrice: parseFloat(signal.price.toString()),
        stopLoss: parseFloat(signal.stop_loss.toString()),
        takeProfits: signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [],
        status: signal.status,
        createdAt: signal.created_at,
        targetsHit: signal.targets_hit || [],
        confidence: signal.confidence
      }));

      // Check for outcomes using pure market conditions
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial monitoring check
    monitorActiveSignals();

    // Monitor every 3 seconds for immediate outcome detection
    const monitorInterval = setInterval(monitorActiveSignals, 3000);

    // Subscribe to real-time price updates
    const priceChannel = supabase
      .channel('outcome-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Check immediately after price updates
          monitorActiveSignals();
        }
      )
      .subscribe();

    console.log('🔄 Pure outcome-based signal monitoring active');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorActiveSignals]);

  return {
    monitorActiveSignals
  };
};
