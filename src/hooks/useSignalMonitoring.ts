
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
      let hitTarget = false;
      let targetLevel = 0;
      let exitPrice = currentPrice;
      let isSuccessful = false;

      // Check stop loss hit first
      if (signal.type === 'BUY') {
        hitStopLoss = currentPrice <= signal.stopLoss;
      } else {
        hitStopLoss = currentPrice >= signal.stopLoss;
      }

      // Check take profit hits (all levels)
      let highestTargetHit = 0;
      if (!hitStopLoss && signal.takeProfits.length > 0) {
        for (let i = 0; i < signal.takeProfits.length; i++) {
          const tpPrice = signal.takeProfits[i];
          let tpHit = false;
          
          if (signal.type === 'BUY') {
            tpHit = currentPrice >= tpPrice;
          } else {
            tpHit = currentPrice <= tpPrice;
          }
          
          if (tpHit) {
            highestTargetHit = i + 1;
            hitTarget = true;
            targetLevel = i + 1;
            exitPrice = tpPrice;
          }
        }
      }

      // Determine if signal should be marked as successful:
      // 1. All targets hit = SUCCESS
      // 2. At least one target hit = SUCCESS (even if later SL hit)
      // 3. Only stop loss hit with no targets = LOSS
      if (hitTarget) {
        isSuccessful = true;
        // If all targets were hit, mark as complete success
        if (highestTargetHit === signal.takeProfits.length) {
          console.log(`🎯 All targets hit for ${signal.symbol} - COMPLETE SUCCESS`);
        } else {
          console.log(`🎯 Target ${targetLevel} hit for ${signal.symbol} - PARTIAL SUCCESS`);
        }
      } else if (hitStopLoss) {
        isSuccessful = false;
        console.log(`⛔ Stop loss hit for ${signal.symbol} - LOSS`);
        exitPrice = signal.stopLoss;
      }

      // Process outcome if any condition is met
      if (hitStopLoss || hitTarget) {
        try {
          console.log(`🔄 Processing outcome for ${signal.symbol}: ${isSuccessful ? 'SUCCESS' : 'LOSS'}`);
          
          // Calculate P&L in pips
          let pnlPips = 0;
          if (signal.type === 'BUY') {
            pnlPips = Math.round((exitPrice - signal.entryPrice) * 10000);
          } else {
            pnlPips = Math.round((signal.entryPrice - exitPrice) * 10000);
          }

          // Determine final outcome status
          let finalStatus = '';
          if (hitTarget && highestTargetHit === signal.takeProfits.length) {
            finalStatus = 'All Take Profits Hit';
          } else if (hitTarget && hitStopLoss) {
            finalStatus = `Take Profit ${targetLevel} Hit, Then Stop Loss`;
          } else if (hitTarget) {
            finalStatus = `Take Profit ${targetLevel} Hit`;
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
              exit_price: exitPrice,
              exit_timestamp: new Date().toISOString(),
              target_hit_level: hitTarget ? targetLevel : null,
              pnl_pips: pnlPips,
              notes: finalStatus
            });

          if (outcomeError) {
            console.error('❌ Error creating signal outcome:', outcomeError);
            continue;
          }

          // Update signal status to expired ONLY after outcome is recorded
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
          
          // Show notification
          const notificationTitle = isSuccessful ? "🎯 Successful Signal!" : "⛔ Signal Stopped Out";
          const notificationDescription = `${signal.symbol} ${signal.type} ${finalStatus} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`;
          
          toast({
            title: notificationTitle,
            description: notificationDescription,
            duration: 8000,
          });

        } catch (error) {
          console.error('❌ Error processing signal outcome:', error);
        }
      }
    }
  }, [toast]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals only (no time-based filtering)
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        return;
      }

      console.log(`🔍 Monitoring ${activeSignals.length} active signals for outcomes...`);

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
        createdAt: signal.created_at
      }));

      // Check for outcomes
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial monitoring check
    monitorActiveSignals();

    // Monitor every 15 seconds for more responsive outcome detection
    const monitorInterval = setInterval(monitorActiveSignals, 15000);

    // Subscribe to real-time price updates for immediate checking
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
          // Check for outcomes immediately after price updates
          setTimeout(monitorActiveSignals, 1000);
        }
      )
      .subscribe();

    // Subscribe to signal updates to refresh monitoring
    const signalChannel = supabase
      .channel('signal-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('📡 Signal update detected:', payload);
          setTimeout(monitorActiveSignals, 2000);
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
