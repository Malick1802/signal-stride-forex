
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
}

export const useSignalMonitoring = () => {
  const { toast } = useToast();

  const checkSignalOutcomes = useCallback(async (signals: SignalToMonitor[], currentPrices: Record<string, number>) => {
    for (const signal of signals) {
      if (signal.status !== 'active') continue;
      
      const currentPrice = currentPrices[signal.symbol];
      if (!currentPrice) continue;

      console.log(`📊 Checking signal ${signal.id} (${signal.symbol}): Current ${currentPrice}, Entry ${signal.entryPrice}`);

      let hitStopLoss = false;
      let hitTarget = false;
      let targetLevel = 0;
      let exitPrice = currentPrice;

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
          let tpHit = false;
          
          if (signal.type === 'BUY') {
            tpHit = currentPrice >= tpPrice;
          } else {
            tpHit = currentPrice <= tpPrice;
          }
          
          if (tpHit) {
            hitTarget = true;
            targetLevel = i + 1;
            exitPrice = tpPrice;
            break; // Take the first hit target
          }
        }
      }

      // Process outcome if hit
      if (hitStopLoss || hitTarget) {
        try {
          console.log(`🎯 Signal outcome detected for ${signal.symbol}: ${hitTarget ? 'TARGET HIT' : 'STOP LOSS HIT'}`);
          
          // Calculate P&L in pips
          let pnlPips = 0;
          if (signal.type === 'BUY') {
            pnlPips = Math.round((exitPrice - signal.entryPrice) * 10000);
          } else {
            pnlPips = Math.round((signal.entryPrice - exitPrice) * 10000);
          }

          // Create signal outcome record
          const { error: outcomeError } = await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: signal.id,
              hit_target: hitTarget,
              exit_price: exitPrice,
              target_hit_level: hitTarget ? targetLevel : null,
              pnl_pips: pnlPips,
              notes: hitTarget ? `Take Profit ${targetLevel} Hit` : 'Stop Loss Hit'
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

          console.log(`✅ Signal ${signal.id} expired with outcome: ${hitTarget ? 'WIN' : 'LOSS'} (${pnlPips} pips)`);
          
          // Show notification
          toast({
            title: hitTarget ? "🎯 Target Hit!" : "⛔ Stop Loss Hit",
            description: `${signal.symbol} ${signal.type} signal ${hitTarget ? `reached Target ${targetLevel}` : 'hit stop loss'} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`,
            duration: 5000,
          });

        } catch (error) {
          console.error('❌ Error processing signal outcome:', error);
        }
      }
    }
  }, [toast]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        return;
      }

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        return;
      }

      // Create price lookup
      const currentPrices: Record<string, number> = {};
      marketData.forEach(data => {
        currentPrices[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Transform signals for monitoring with proper type casting
      const signalsToMonitor: SignalToMonitor[] = activeSignals.map(signal => ({
        id: signal.id,
        symbol: signal.symbol,
        type: (signal.type === 'BUY' || signal.type === 'SELL') ? signal.type as 'BUY' | 'SELL' : 'BUY',
        entryPrice: parseFloat(signal.price.toString()),
        stopLoss: parseFloat(signal.stop_loss.toString()),
        takeProfits: signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [],
        status: signal.status
      }));

      // Check for outcomes
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial check
    monitorActiveSignals();

    // Monitor every 15 seconds for faster outcome detection
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
          // Immediate check after price updates
          setTimeout(monitorActiveSignals, 1000);
        }
      )
      .subscribe();

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorActiveSignals]);

  return {
    monitorActiveSignals
  };
};
