
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

      console.log(`📊 ENHANCED MONITORING signal ${signal.id} (${signal.symbol}): Current ${currentPrice}, Entry ${signal.entryPrice}, SL ${signal.stopLoss}`);

      let hitStopLoss = false;
      let newTargetsHit = [...signal.targetsHit];
      let hasNewTargetHit = false;

      // Check stop loss hit first (ONLY market-based expiration)
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
            console.log(`🎯 NEW TARGET ${targetNumber} HIT for ${signal.symbol}! Market-based outcome detected`);
            
            // Show immediate notification for new target hit
            toast({
              title: `🎯 Target ${targetNumber} Hit!`,
              description: `${signal.symbol} ${signal.type} reached TP${targetNumber} at ${tpPrice.toFixed(5)} (Market-based monitoring)`,
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
            console.log(`✅ Market-based targets_hit update for ${signal.symbol}:`, newTargetsHit);
          }
        } catch (error) {
          console.error('❌ Error updating signal targets:', error);
        }
      }

      // Check if signal should be expired (all targets hit OR stop loss hit) - MARKET CONDITIONS ONLY
      const allTargetsHit = newTargetsHit.length === signal.takeProfits.length;
      if (hitStopLoss || allTargetsHit) {
        try {
          console.log(`🔄 MARKET-BASED EXPIRATION for ${signal.symbol}: ${allTargetsHit ? 'ALL TARGETS HIT' : 'STOP LOSS HIT'}`);
          
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
            finalStatus = 'All Take Profits Hit (Market-based)';
          } else if (newTargetsHit.length > 0 && hitStopLoss) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit, Then Stop Loss (Market-based)`;
          } else if (newTargetsHit.length > 0) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit (Market-based)`;
          } else {
            finalStatus = 'Stop Loss Hit (Market-based)';
          }

          // Check if outcome already exists to prevent duplicates
          const { data: existingOutcome } = await supabase
            .from('signal_outcomes')
            .select('id')
            .eq('signal_id', signal.id)
            .single();

          if (existingOutcome) {
            console.log(`⚠️ Market outcome already exists for signal ${signal.id}, skipping`);
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
            console.error('❌ Error creating market-based signal outcome:', outcomeError);
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

          console.log(`✅ MARKET-BASED EXPIRATION: Signal ${signal.id} expired with outcome: ${isSuccessful ? 'SUCCESS' : 'LOSS'} (${pnlPips} pips) - ${finalStatus}`);
          
          // Show final notification
          const notificationTitle = isSuccessful ? "🎯 Signal Completed Successfully!" : "⛔ Signal Stopped Out";
          const notificationDescription = `${signal.symbol} ${signal.type} ${finalStatus} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`;
          
          toast({
            title: notificationTitle,
            description: notificationDescription,
            duration: 8000,
          });

        } catch (error) {
          console.error('❌ Error processing market-based signal outcome:', error);
        }
      }
    }
  }, [toast]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals only (no time-based filtering - market monitoring only)
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        return;
      }

      console.log(`🔍 MARKET-BASED MONITORING: ${activeSignals.length} active signals (time-based expiration eliminated)...`);

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        console.log('⚠️ No market data available for enhanced signal monitoring');
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

      // Check for outcomes using ONLY market conditions
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in enhanced market-based signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial monitoring check
    monitorActiveSignals();

    // Enhanced monitoring every 10 seconds for more responsive market-based outcome detection
    const monitorInterval = setInterval(monitorActiveSignals, 10000);

    // Subscribe to real-time price updates for immediate market-based checking
    const priceChannel = supabase
      .channel('enhanced-market-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Check for market-based outcomes immediately after price updates
          setTimeout(monitorActiveSignals, 500);
        }
      )
      .subscribe();

    // Subscribe to signal updates to refresh enhanced monitoring
    const signalChannel = supabase
      .channel('enhanced-signal-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('📡 Enhanced signal update detected (market-based monitoring only):', payload);
          setTimeout(monitorActiveSignals, 1000);
        }
      )
      .subscribe();

    console.log('🔄 Enhanced market-based signal monitoring initialized - time-based expiration eliminated');

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
