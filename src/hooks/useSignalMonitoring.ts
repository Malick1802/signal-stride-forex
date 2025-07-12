
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSMSNotifications } from './useSMSNotifications';
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
  const { sendNewSignalSMS, sendTargetHitSMS, sendStopLossSMS, sendSignalCompleteSMS } = useSMSNotifications();

  // Get user profile for SMS notifications
  const getUserProfile = useCallback(async () => {
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, sms_notifications_enabled, sms_verified')
      .eq('id', user.id)
      .single();
    
    return profile;
  }, [user]);

  const checkSignalOutcomes = useCallback(async (signals: SignalToMonitor[], currentPrices: Record<string, number>) => {
    const userProfile = await getUserProfile();
    
    for (const signal of signals) {
      if (signal.status !== 'active') continue;
      
      const currentPrice = currentPrices[signal.symbol];
      if (!currentPrice) continue;

      console.log(`📊 PURE OUTCOME-BASED MONITORING signal ${signal.id} (${signal.symbol}): Current ${currentPrice}, Entry ${signal.entryPrice}, SL ${signal.stopLoss}`);

      let hitStopLoss = false;
      let newTargetsHit = [...signal.targetsHit];
      let hasNewTargetHit = false;

      // Check stop loss hit first (ONLY outcome-based expiration)
      if (signal.type === 'BUY') {
        hitStopLoss = currentPrice <= signal.stopLoss;
      } else {
        hitStopLoss = currentPrice >= signal.stopLoss;
      }

      // Check take profit hits and update targets_hit array
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
          
          // If target hit and not already recorded, add to array
          if (tpHit && !newTargetsHit.includes(targetNumber)) {
            newTargetsHit.push(targetNumber);
            newTargetsHit.sort();
            hasNewTargetHit = true;
            console.log(`🎯 NEW TARGET ${targetNumber} HIT for ${signal.symbol}! Pure outcome-based detection`);
            
            // Show immediate notification for new target hit
            toast({
              title: `🎯 Target ${targetNumber} Hit!`,
              description: `${signal.symbol} ${signal.type} reached TP${targetNumber} at ${tpPrice.toFixed(5)} (Pure outcome-based)`,
              duration: 6000,
            });

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

      // Update targets_hit array if new targets were hit
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
            console.error('❌ Error updating targets_hit:', updateError);
          } else {
            console.log(`✅ Pure outcome-based targets_hit update for ${signal.symbol}:`, newTargetsHit);
          }
        } catch (error) {
          console.error('❌ Error updating signal targets:', error);
        }
      }

      // Check if signal should be expired (all targets hit OR stop loss hit) - PURE OUTCOME ONLY
      const allTargetsHit = newTargetsHit.length === signal.takeProfits.length;
      if (hitStopLoss || allTargetsHit) {
        try {
          console.log(`🔄 PURE OUTCOME-BASED EXPIRATION for ${signal.symbol}: ${allTargetsHit ? 'ALL TARGETS HIT' : 'STOP LOSS HIT'} - NO TIME COMPONENT`);
          
          // Calculate final exit price and P&L
          let finalExitPrice = currentPrice;
          let isSuccessful = allTargetsHit;
          
          if (allTargetsHit) {
            // Use the highest hit target price
            const highestHitTarget = Math.max(...newTargetsHit);
            finalExitPrice = signal.takeProfits[highestHitTarget - 1];
          } else if (hitStopLoss) {
            finalExitPrice = signal.stopLoss;
            isSuccessful = false;
          }
          
          let pnlPips = 0;
          if (signal.type === 'BUY') {
            pnlPips = Math.round((finalExitPrice - signal.entryPrice) * 10000);
          } else {
            pnlPips = Math.round((signal.entryPrice - finalExitPrice) * 10000);
          }

          // Determine final outcome status
          let finalStatus = '';
          if (allTargetsHit) {
            finalStatus = 'All Take Profits Hit (Pure Outcome-Based)';
          } else if (newTargetsHit.length > 0 && hitStopLoss) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit, Then Stop Loss (Pure Outcome-Based)`;
          } else if (newTargetsHit.length > 0) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit (Pure Outcome-Based)`;
          } else {
            finalStatus = 'Stop Loss Hit (Pure Outcome-Based)';
          }

          // Check if outcome already exists to prevent duplicates
          const { data: existingOutcome } = await supabase
            .from('signal_outcomes')
            .select('id')
            .eq('signal_id', signal.id)
            .single();

          if (existingOutcome) {
            console.log(`⚠️ Pure outcome already exists for signal ${signal.id}, skipping`);
            continue;
          }

          // Create signal outcome record
          const { error: outcomeError } = await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: signal.id,
              hit_target: isSuccessful,
              exit_price: finalExitPrice,
              exit_timestamp: new Date().toISOString(),
              target_hit_level: newTargetsHit.length > 0 ? Math.max(...newTargetsHit) : null,
              pnl_pips: pnlPips,
              notes: finalStatus
            });

          if (outcomeError) {
            console.error('❌ Error creating pure outcome-based signal outcome:', outcomeError);
            continue;
          }

          // Update signal status to expired
          const { error: updateError } = await supabase
            .from('trading_signals')
            .update({ 
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (updateError) {
            console.error('❌ Error updating signal status:', updateError);
            continue;
          }

          console.log(`✅ PURE OUTCOME-BASED EXPIRATION: Signal ${signal.id} expired with outcome: ${isSuccessful ? 'SUCCESS' : 'LOSS'} (${pnlPips} pips) - ${finalStatus}`);
          
          // Show final notification
          const notificationTitle = isSuccessful ? "🎯 Signal Completed Successfully!" : "⛔ Signal Stopped Out";
          const notificationDescription = `${signal.symbol} ${signal.type} ${finalStatus} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`;
          
          toast({
            title: notificationTitle,
            description: notificationDescription,
            duration: 8000,
          });

          // Send SMS notification for signal completion
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

        } catch (error) {
          console.error('❌ Error processing pure outcome-based signal expiration:', error);
        }
      }
    }
  }, [toast, getUserProfile, sendTargetHitSMS, sendStopLossSMS, sendSignalCompleteSMS]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals only (no time-based filtering - pure outcome monitoring only)
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        return;
      }

      console.log(`🔍 PURE OUTCOME-BASED MONITORING: ${activeSignals.length} active signals (time-based expiration ELIMINATED)...`);

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        console.log('⚠️ No market data available for pure outcome-based signal monitoring');
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

      // Check for outcomes using ONLY pure market conditions (NO time component)
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in pure outcome-based signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial monitoring check
    monitorActiveSignals();

    // Enhanced monitoring every 5 seconds for immediate pure outcome-based detection
    const monitorInterval = setInterval(monitorActiveSignals, 5000);

    // Subscribe to real-time price updates for immediate pure outcome-based checking
    const priceChannel = supabase
      .channel('pure-outcome-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Check for pure outcome-based results immediately after price updates
          setTimeout(monitorActiveSignals, 500);
        }
      )
      .subscribe();

    // Subscribe to signal updates to refresh pure outcome monitoring
    const signalChannel = supabase
      .channel('pure-outcome-signal-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('📡 Pure outcome-based signal update detected (NO time expiration):', payload);
          setTimeout(monitorActiveSignals, 1000);
        }
      )
      .subscribe();

    console.log('🔄 Pure outcome-based signal monitoring initialized - time-based expiration ELIMINATED');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
      supabase.removeChannel(signalChannel);
    };
  }, [monitorActiveSignals]);

  return {
    monitorActiveSignals
  };
};
