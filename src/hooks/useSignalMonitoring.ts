
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

export const useSignalMonitoring = () => {
  const { toast } = useToast();

  const checkSignalOutcomes = useCallback(async (signals: SignalToMonitor[], currentPrices: Record<string, number>) => {
    for (const signal of signals) {
      if (signal.status !== 'active') continue;
      
      const currentPrice = currentPrices[signal.symbol];
      if (!currentPrice) continue;

      console.log(`📊 Monitoring signal ${signal.id} (${signal.symbol}): Current ${currentPrice}, Entry ${signal.entryPrice}, SL ${signal.stopLoss}`);

      let hitStopLoss = false;
      let newTargetsHit = [...signal.targetsHit];
      let hasNewTargetHit = false;
      let shouldExpireSignal = false;

      // Check stop loss hit with proper tolerance (1 pip = 0.0001 for most pairs)
      const slTolerance = 0.0001;
      if (signal.type === 'BUY') {
        hitStopLoss = currentPrice <= (signal.stopLoss + slTolerance);
      } else {
        hitStopLoss = currentPrice >= (signal.stopLoss - slTolerance);
      }

      // Check take profit hits with proper tolerance
      if (!hitStopLoss && signal.takeProfits.length > 0) {
        for (let i = 0; i < signal.takeProfits.length; i++) {
          const tpPrice = signal.takeProfits[i];
          const targetNumber = i + 1;
          let tpHit = false;
          
          const tpTolerance = 0.0001;
          if (signal.type === 'BUY') {
            tpHit = currentPrice >= (tpPrice - tpTolerance);
          } else {
            tpHit = currentPrice <= (tpPrice + tpTolerance);
          }
          
          // If target hit and not already recorded, add to array
          if (tpHit && !newTargetsHit.includes(targetNumber)) {
            newTargetsHit.push(targetNumber);
            newTargetsHit.sort();
            hasNewTargetHit = true;
            console.log(`🎯 NEW TARGET ${targetNumber} HIT for ${signal.symbol}! Price: ${currentPrice}, TP: ${tpPrice}`);
            
            // Show immediate notification for new target hit
            toast({
              title: `🎯 Target ${targetNumber} Hit!`,
              description: `${signal.symbol} ${signal.type} reached TP${targetNumber} at ${tpPrice.toFixed(5)}`,
              duration: 6000,
            });
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
            console.log(`✅ Updated targets_hit for ${signal.symbol}:`, newTargetsHit);
          }
        } catch (error) {
          console.error('❌ Error updating signal targets:', error);
        }
      }

      // Determine if signal should expire
      const allTargetsHit = newTargetsHit.length === signal.takeProfits.length && signal.takeProfits.length > 0;
      
      // ONLY expire if:
      // 1. Stop loss is definitively hit, OR
      // 2. ALL take profit targets are hit
      shouldExpireSignal = hitStopLoss || allTargetsHit;

      // Additional check for very old signals (older than 7 days) - force expire
      const signalAge = Date.now() - new Date(signal.createdAt).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const isVeryOld = signalAge > maxAge;

      if (isVeryOld && !shouldExpireSignal) {
        console.log(`⏰ Signal ${signal.id} is very old (${Math.floor(signalAge / (24 * 60 * 60 * 1000))} days), force expiring`);
        shouldExpireSignal = true;
        hitStopLoss = true; // Treat as stop loss for very old signals
      }

      if (shouldExpireSignal) {
        try {
          console.log(`🔄 Processing final outcome for ${signal.symbol}: ${allTargetsHit ? 'ALL TARGETS HIT' : hitStopLoss ? 'STOP LOSS HIT' : 'FORCE EXPIRED'}`);
          
          // Calculate final exit price and P&L
          let finalExitPrice = currentPrice;
          let isSuccessful = allTargetsHit;
          
          if (allTargetsHit) {
            // Use the highest hit target price
            const highestHitTarget = Math.max(...newTargetsHit);
            finalExitPrice = signal.takeProfits[highestHitTarget - 1];
            isSuccessful = true;
          } else if (hitStopLoss || isVeryOld) {
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
            finalStatus = 'All Take Profits Hit';
          } else if (newTargetsHit.length > 0 && (hitStopLoss || isVeryOld)) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit, Then Stop Loss`;
          } else if (newTargetsHit.length > 0) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit`;
          } else if (isVeryOld) {
            finalStatus = 'Signal Expired (Time Limit)';
          } else {
            finalStatus = 'Stop Loss Hit';
          }

          // Check if outcome already exists to prevent duplicates
          const { data: existingOutcome } = await supabase
            .from('signal_outcomes')
            .select('id')
            .eq('signal_id', signal.id)
            .single();

          if (existingOutcome) {
            console.log(`⚠️ Outcome already exists for signal ${signal.id}, skipping`);
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
            console.error('❌ Error creating signal outcome:', outcomeError);
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

          console.log(`✅ Signal ${signal.id} expired with outcome: ${isSuccessful ? 'SUCCESS' : 'LOSS'} (${pnlPips} pips) - ${finalStatus}`);
          
          // Show final notification
          const notificationTitle = isSuccessful ? "🎯 Signal Completed Successfully!" : isVeryOld ? "⏰ Signal Expired (Time Limit)" : "⛔ Signal Stopped Out";
          const notificationDescription = `${signal.symbol} ${signal.type} ${finalStatus} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`;
          
          toast({
            title: notificationTitle,
            description: notificationDescription,
            duration: 8000,
          });

        } catch (error) {
          console.error('❌ Error processing signal outcome:', error);
        }
      } else {
        console.log(`⏳ Signal ${signal.id} (${signal.symbol}) remains active - no exit conditions met`);
      }
    }
  }, [toast]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals only
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        if (signalsError) {
          console.error('❌ Error fetching active signals:', signalsError);
        }
        return;
      }

      console.log(`🔍 Monitoring ${activeSignals.length} active signals for precise outcome detection...`);

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
        targetsHit: signal.targets_hit || []
      }));

      // Check for outcomes with precise logic
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial monitoring check
    monitorActiveSignals();

    // Monitor every 30 seconds for accurate outcome detection
    const monitorInterval = setInterval(monitorActiveSignals, 30000);

    // Subscribe to real-time price updates for immediate checking
    const priceChannel = supabase
      .channel('precise-outcome-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Check for outcomes immediately after price updates
          setTimeout(monitorActiveSignals, 2000);
        }
      )
      .subscribe();

    // Subscribe to signal updates to refresh monitoring
    const signalChannel = supabase
      .channel('signal-updates-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('📡 Signal update detected for monitoring:', payload);
          setTimeout(monitorActiveSignals, 3000);
        }
      )
      .subscribe();

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
