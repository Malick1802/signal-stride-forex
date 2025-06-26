
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignalOutcomeData {
  signal_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry_price: number;
  current_price: number;
  stop_loss: number;
  take_profits: number[];
  status: string;
  created_at: string;
  targets_hit: number[];
}

export const useSignalOutcomeTracker = () => {
  const { toast } = useToast();

  const repairSignalOutcome = useCallback(async (signalData: SignalOutcomeData) => {
    try {
      console.log(`🛠️ Repairing missing outcome for signal ${signalData.signal_id}`);

      let exitPrice = signalData.current_price || signalData.entry_price;
      let hitStopLoss = false;
      let hitTargets = signalData.targets_hit || [];

      // Check if stop loss was hit
      if (signalData.type === 'BUY') {
        hitStopLoss = signalData.current_price <= signalData.stop_loss;
      } else {
        hitStopLoss = signalData.current_price >= signalData.stop_loss;
      }

      if (hitStopLoss) {
        exitPrice = signalData.stop_loss;
      }

      // Calculate P&L
      let pnlPips = 0;
      if (signalData.type === 'BUY') {
        pnlPips = Math.round((exitPrice - signalData.entry_price) * 10000);
      } else {
        pnlPips = Math.round((signalData.entry_price - exitPrice) * 10000);
      }

      const outcomeNotes = hitStopLoss 
        ? `Stop Loss Hit (Repaired)`
        : hitTargets.length > 0 
          ? `Take Profit ${Math.max(...hitTargets)} Hit (Repaired)`
          : `Unknown Exit Reason (Repaired)`;

      // Create the missing outcome record
      const { error: outcomeError } = await supabase
        .from('signal_outcomes')
        .insert({
          signal_id: signalData.signal_id,
          hit_target: hitTargets.length > 0 && !hitStopLoss,
          exit_price: exitPrice,
          exit_timestamp: new Date().toISOString(),
          target_hit_level: hitTargets.length > 0 ? Math.max(...hitTargets) : null,
          pnl_pips: pnlPips,
          notes: outcomeNotes
        });

      if (outcomeError) {
        console.error(`❌ Failed to create outcome for ${signalData.signal_id}:`, outcomeError);
        return false;
      }

      console.log(`✅ Repaired outcome for ${signalData.signal_id} - ${outcomeNotes} (${pnlPips} pips)`);
      return true;

    } catch (error) {
      console.error(`❌ Error repairing signal ${signalData.signal_id}:`, error);
      return false;
    }
  }, []);

  const safeParseArray = (arrayData: any): number[] => {
    if (!arrayData) return [];
    if (!Array.isArray(arrayData)) return [];
    return arrayData.filter(item => item !== null && item !== undefined && !isNaN(parseFloat(item)))
                   .map(item => parseFloat(item.toString()));
  };

  const repairExpiredSignalsWithoutOutcomes = useCallback(async () => {
    try {
      console.log('🔍 Checking for expired signals without outcome records...');

      // Get expired signals without outcomes
      const { data: expiredSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          type,
          price,
          stop_loss,
          take_profits,
          status,
          created_at,
          targets_hit
        `)
        .eq('status', 'expired');

      if (signalsError) {
        console.error('❌ Error checking expired signals:', signalsError);
        return;
      }

      if (!expiredSignals || expiredSignals.length === 0) {
        console.log('✅ No expired signals found');
        return;
      }

      // Get existing outcomes for these signals
      const signalIds = expiredSignals.map(s => s.id);
      const { data: existingOutcomes, error: outcomesError } = await supabase
        .from('signal_outcomes')
        .select('signal_id')
        .in('signal_id', signalIds);

      if (outcomesError) {
        console.error('❌ Error checking outcomes:', outcomesError);
        return;
      }

      // Find signals without outcomes
      const signalsWithOutcomes = new Set(existingOutcomes?.map(o => o.signal_id) || []);
      const expiredSignalsWithoutOutcomes = expiredSignals.filter(signal => 
        !signalsWithOutcomes.has(signal.id)
      );

      if (expiredSignalsWithoutOutcomes.length === 0) {
        console.log('✅ All expired signals have outcome records');
        return;
      }

      console.warn(`⚠️ Found ${expiredSignalsWithoutOutcomes.length} expired signals without outcomes`);

      // Get current market prices for repair
      const symbols = [...new Set(expiredSignalsWithoutOutcomes.map(s => s.symbol))];
      const { data: marketData, error: marketError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (marketError) {
        console.error('❌ Error getting market data:', marketError);
      }

      const priceMap: Record<string, number> = {};
      marketData?.forEach(data => {
        if (data.current_price) {
          priceMap[data.symbol] = parseFloat(data.current_price.toString());
        }
      });

      // Repair each signal (limit to prevent timeout)
      const signalsToRepair = expiredSignalsWithoutOutcomes.slice(0, 10);
      let repairedCount = 0;

      for (const signal of signalsToRepair) {
        try {
          if (!signal || !signal.id || !signal.symbol || !signal.type || !signal.price || !signal.stop_loss) {
            console.warn(`⚠️ Skipping signal with missing data: ${signal?.id}`);
            continue;
          }

          const entryPrice = parseFloat(signal.price.toString());
          const stopLoss = parseFloat(signal.stop_loss.toString());
          
          if (isNaN(entryPrice) || isNaN(stopLoss)) {
            console.warn(`⚠️ Skipping signal with invalid prices: ${signal.id}`);
            continue;
          }

          const signalData: SignalOutcomeData = {
            signal_id: signal.id,
            symbol: signal.symbol,
            type: signal.type as 'BUY' | 'SELL',
            entry_price: entryPrice,
            current_price: priceMap[signal.symbol] || entryPrice,
            stop_loss: stopLoss,
            take_profits: safeParseArray(signal.take_profits),
            status: signal.status,
            created_at: signal.created_at,
            targets_hit: safeParseArray(signal.targets_hit)
          };

          const success = await repairSignalOutcome(signalData);
          if (success) {
            repairedCount++;
          }
        } catch (repairError) {
          console.error(`❌ Failed to repair signal ${signal.id}:`, repairError);
        }
      }

      if (repairedCount > 0) {
        toast({
          title: "Outcome Repair Complete",
          description: `Repaired ${repairedCount} of ${expiredSignalsWithoutOutcomes.length} signals without outcomes`,
        });
      }

    } catch (error) {
      console.error('❌ Error in repair process:', error);
      toast({
        title: "Repair Error",
        description: "Failed to complete outcome repair. Check console for details.",
        variant: "destructive"
      });
    }
  }, [repairSignalOutcome, toast]);

  useEffect(() => {
    // Run repair check after a delay
    const delayedRepair = setTimeout(() => {
      repairExpiredSignalsWithoutOutcomes();
    }, 5000);

    return () => {
      clearTimeout(delayedRepair);
    };
  }, [repairExpiredSignalsWithoutOutcomes]);

  return {
    repairExpiredSignalsWithoutOutcomes,
    repairSignalOutcome
  };
};
