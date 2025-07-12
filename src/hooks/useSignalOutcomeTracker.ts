
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

  const auditSignalExpiration = useCallback(async (signalId: string, reason: string, source: string) => {
    try {
      console.log(`🔍 PURE OUTCOME AUDIT: Signal ${signalId} expiration - Reason: ${reason}, Source: ${source}`);
      
      // Check if outcome already exists with proper error handling
      const { data: existingOutcome, error: outcomeError } = await supabase
        .from('signal_outcomes')
        .select('id, notes')
        .eq('signal_id', signalId)
        .maybeSingle();

      if (outcomeError) {
        console.error(`❌ PURE OUTCOME AUDIT ERROR: Failed to check existing outcome for ${signalId}:`, outcomeError);
        return false;
      }

      if (existingOutcome) {
        console.log(`✅ PURE OUTCOME AUDIT: Signal ${signalId} has valid outcome record: ${existingOutcome.notes}`);
        return true;
      }

      console.warn(`⚠️ PURE OUTCOME AUDIT: Signal ${signalId} expired WITHOUT outcome record - investigating for time-based interference...`);
      return false;
    } catch (error) {
      console.error(`❌ PURE OUTCOME AUDIT ERROR for signal ${signalId}:`, error);
      return false;
    }
  }, []);

  const ensureOutcomeForExpiredSignal = useCallback(async (signalData: SignalOutcomeData) => {
    try {
      console.log(`🛠️ PURE OUTCOME REPAIR: Creating missing outcome for expired signal ${signalData.signal_id}`);

      // Calculate what the outcome should have been based on pure market conditions
      let exitPrice = signalData.current_price || signalData.entry_price;
      let hitStopLoss = false;
      let hitTargets = signalData.targets_hit || [];

      // Check if stop loss was hit (pure price comparison)
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
        ? `Stop Loss Hit (Retroactive Pure Outcome Analysis)`
        : hitTargets.length > 0 
          ? `Take Profit ${Math.max(...hitTargets)} Hit (Retroactive Pure Outcome Analysis)`
          : `Unknown Exit Reason (Retroactive Pure Outcome Analysis - Possible Time-Based Interference)`;

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
        console.error(`❌ PURE OUTCOME REPAIR ERROR: Failed to create outcome for ${signalData.signal_id}:`, outcomeError);
        return false;
      }

      console.log(`✅ PURE OUTCOME REPAIR SUCCESS: Created outcome for ${signalData.signal_id} - ${outcomeNotes} (${pnlPips} pips)`);
      return true;

    } catch (error) {
      console.error(`❌ PURE OUTCOME REPAIR ERROR for signal ${signalData.signal_id}:`, error);
      return false;
    }
  }, []);

  const safeParseArray = (arrayData: any): number[] => {
    if (!arrayData) return [];
    if (!Array.isArray(arrayData)) return [];
    return arrayData.filter(item => item !== null && item !== undefined && !isNaN(parseFloat(item)))
                   .map(item => parseFloat(item.toString()));
  };

  const investigateExpiredSignalsWithoutOutcomes = useCallback(async () => {
    try {
      console.log('🔍 PURE OUTCOME INVESTIGATION: Checking for expired signals without outcome records (time-based interference detection)...');

      // Step 1: Get all expired signals first
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
        console.error('❌ PURE OUTCOME INVESTIGATION ERROR (signals query):', signalsError);
        return;
      }

      if (!expiredSignals || expiredSignals.length === 0) {
        console.log('✅ PURE OUTCOME INVESTIGATION: No expired signals found');
        return;
      }

      // Step 2: Get all existing outcomes for these signals
      const signalIds = expiredSignals.map(s => s.id);
      const { data: existingOutcomes, error: outcomesError } = await supabase
        .from('signal_outcomes')
        .select('signal_id')
        .in('signal_id', signalIds);

      if (outcomesError) {
        console.error('❌ PURE OUTCOME INVESTIGATION ERROR (outcomes query):', outcomesError);
        return;
      }

      // Step 3: Find signals without outcomes (likely time-based expiration interference)
      const signalsWithOutcomes = new Set(existingOutcomes?.map(o => o.signal_id) || []);
      const expiredSignalsWithoutOutcomes = expiredSignals.filter(signal => 
        !signalsWithOutcomes.has(signal.id)
      );

      if (expiredSignalsWithoutOutcomes.length === 0) {
        console.log('✅ PURE OUTCOME INVESTIGATION: All expired signals have valid outcome records');
        return;
      }

      console.warn(`⚠️ PURE OUTCOME INVESTIGATION: Found ${expiredSignalsWithoutOutcomes.length} expired signals WITHOUT outcome records - LIKELY TIME-BASED INTERFERENCE`);

      // Step 4: Get current market prices for these signals
      const symbols = [...new Set(expiredSignalsWithoutOutcomes.map(s => s.symbol))];
      const { data: marketData, error: marketError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (marketError) {
        console.error('❌ PURE OUTCOME INVESTIGATION ERROR (market data query):', marketError);
        // Continue without current prices - use entry prices as fallback
      }

      const priceMap: Record<string, number> = {};
      marketData?.forEach(data => {
        if (data.current_price) {
          priceMap[data.symbol] = parseFloat(data.current_price.toString());
        }
      });

      // Step 5: Repair each signal without outcome (limit to prevent timeout)
      const signalsToRepair = expiredSignalsWithoutOutcomes.slice(0, 10); // Process max 10 at a time
      let repairedCount = 0;

      for (const signal of signalsToRepair) {
        try {
          // Enhanced null safety for signal processing
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

          const success = await ensureOutcomeForExpiredSignal(signalData);
          if (success) {
            repairedCount++;
          }
        } catch (repairError) {
          console.error(`❌ Failed to repair signal ${signal.id}:`, repairError);
        }
      }

      if (repairedCount > 0) {
        toast({
          title: "Pure Outcome Investigation Complete",
          description: `Repaired ${repairedCount} of ${expiredSignalsWithoutOutcomes.length} signals affected by time-based interference`,
        });
      }

    } catch (error) {
      console.error('❌ PURE OUTCOME INVESTIGATION ERROR:', error);
      toast({
        title: "Investigation Error",
        description: "Failed to complete pure outcome investigation. Check console for details.",
        variant: "destructive"
      });
    }
  }, [ensureOutcomeForExpiredSignal, toast]);

  useEffect(() => {
    // Add a delay to prevent immediate execution on page load
    const delayedInvestigation = setTimeout(() => {
      investigateExpiredSignalsWithoutOutcomes();
    }, 2000);

    // Set up monitoring for signal status changes with proper error handling
    let signalStatusChannel: any = null;

    try {
      signalStatusChannel = supabase
        .channel('pure-outcome-status-audit')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trading_signals',
            filter: 'status=eq.expired'
          },
          async (payload) => {
            try {
              console.log('🔍 PURE OUTCOME AUDIT: Signal status changed to expired:', payload);
              const signalId = payload.new?.id;
              
              if (!signalId) {
                console.warn('⚠️ PURE OUTCOME AUDIT: No signal ID found in payload');
                return;
              }
              
              // Wait a moment for any outcome to be created
              setTimeout(async () => {
                try {
                  const hasOutcome = await auditSignalExpiration(signalId, 'Status changed to expired', 'Pure outcome monitoring');
                  if (!hasOutcome) {
                    console.warn(`⚠️ PURE OUTCOME AUDIT: Signal ${signalId} expired without outcome - POSSIBLE TIME-BASED INTERFERENCE`);
                  }
                } catch (auditError) {
                  console.error(`❌ PURE OUTCOME AUDIT ERROR for signal ${signalId}:`, auditError);
                }
              }, 2000);
            } catch (handlerError) {
              console.error('❌ PURE OUTCOME AUDIT HANDLER ERROR:', handlerError);
            }
          }
        )
        .subscribe();
    } catch (subscriptionError) {
      console.error('❌ Failed to set up pure outcome monitoring subscription:', subscriptionError);
    }

    return () => {
      clearTimeout(delayedInvestigation);
      if (signalStatusChannel) {
        try {
          supabase.removeChannel(signalStatusChannel);
        } catch (cleanupError) {
          console.error('❌ Error cleaning up subscription:', cleanupError);
        }
      }
    };
  }, [investigateExpiredSignalsWithoutOutcomes, auditSignalExpiration]);

  return {
    investigateExpiredSignalsWithoutOutcomes,
    auditSignalExpiration,
    ensureOutcomeForExpiredSignal
  };
};
