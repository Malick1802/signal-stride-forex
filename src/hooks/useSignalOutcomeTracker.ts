
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
      console.log(`🔍 AUDIT: Signal ${signalId} expiration - Reason: ${reason}, Source: ${source}`);
      
      // Check if outcome already exists with proper error handling
      const { data: existingOutcome, error: outcomeError } = await supabase
        .from('signal_outcomes')
        .select('id, notes')
        .eq('signal_id', signalId)
        .maybeSingle();

      if (outcomeError) {
        console.error(`❌ AUDIT ERROR: Failed to check existing outcome for ${signalId}:`, outcomeError);
        return false;
      }

      if (existingOutcome) {
        console.log(`✅ AUDIT: Signal ${signalId} already has outcome record: ${existingOutcome.notes}`);
        return true;
      }

      console.warn(`⚠️ AUDIT: Signal ${signalId} expired WITHOUT outcome record - investigating...`);
      return false;
    } catch (error) {
      console.error(`❌ AUDIT ERROR for signal ${signalId}:`, error);
      return false;
    }
  }, []);

  const ensureOutcomeForExpiredSignal = useCallback(async (signalData: SignalOutcomeData) => {
    try {
      console.log(`🛠️ REPAIR: Creating missing outcome for expired signal ${signalData.signal_id}`);

      // Calculate what the outcome should have been
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
        ? `Stop Loss Hit (Retroactive Analysis - Market-Based)`
        : hitTargets.length > 0 
          ? `Take Profit ${Math.max(...hitTargets)} Hit (Retroactive Analysis - Market-Based)`
          : `Unknown Exit Reason (Retroactive Analysis - Market-Based)`;

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
        console.error(`❌ REPAIR ERROR: Failed to create outcome for ${signalData.signal_id}:`, outcomeError);
        return false;
      }

      console.log(`✅ REPAIR SUCCESS: Created outcome for ${signalData.signal_id} - ${outcomeNotes} (${pnlPips} pips)`);
      return true;

    } catch (error) {
      console.error(`❌ REPAIR ERROR for signal ${signalData.signal_id}:`, error);
      return false;
    }
  }, []);

  const investigateExpiredSignalsWithoutOutcomes = useCallback(async () => {
    try {
      console.log('🔍 INVESTIGATION: Checking for expired signals without outcome records...');

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
        console.error('❌ INVESTIGATION ERROR (signals query):', signalsError);
        return;
      }

      if (!expiredSignals || expiredSignals.length === 0) {
        console.log('✅ INVESTIGATION: No expired signals found');
        return;
      }

      // Step 2: Get all existing outcomes for these signals
      const signalIds = expiredSignals.map(s => s.id);
      const { data: existingOutcomes, error: outcomesError } = await supabase
        .from('signal_outcomes')
        .select('signal_id')
        .in('signal_id', signalIds);

      if (outcomesError) {
        console.error('❌ INVESTIGATION ERROR (outcomes query):', outcomesError);
        return;
      }

      // Step 3: Find signals without outcomes
      const signalsWithOutcomes = new Set(existingOutcomes?.map(o => o.signal_id) || []);
      const expiredSignalsWithoutOutcomes = expiredSignals.filter(signal => 
        !signalsWithOutcomes.has(signal.id)
      );

      if (expiredSignalsWithoutOutcomes.length === 0) {
        console.log('✅ INVESTIGATION: All expired signals have outcome records');
        return;
      }

      console.warn(`⚠️ INVESTIGATION: Found ${expiredSignalsWithoutOutcomes.length} expired signals WITHOUT outcome records`);

      // Step 4: Get current market prices for these signals
      const symbols = [...new Set(expiredSignalsWithoutOutcomes.map(s => s.symbol))];
      const { data: marketData, error: marketError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (marketError) {
        console.error('❌ INVESTIGATION ERROR (market data query):', marketError);
        // Continue without current prices - use entry prices as fallback
      }

      const priceMap: Record<string, number> = {};
      marketData?.forEach(data => {
        priceMap[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Step 5: Repair each signal without outcome (limit to prevent timeout)
      const signalsToRepair = expiredSignalsWithoutOutcomes.slice(0, 10); // Process max 10 at a time
      let repairedCount = 0;

      for (const signal of signalsToRepair) {
        try {
          const signalData: SignalOutcomeData = {
            signal_id: signal.id,
            symbol: signal.symbol,
            type: signal.type as 'BUY' | 'SELL',
            entry_price: parseFloat(signal.price.toString()),
            current_price: priceMap[signal.symbol] || parseFloat(signal.price.toString()),
            stop_loss: parseFloat(signal.stop_loss.toString()),
            take_profits: signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [],
            status: signal.status,
            created_at: signal.created_at,
            targets_hit: signal.targets_hit || []
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
          title: "Investigation Complete",
          description: `Repaired ${repairedCount} of ${expiredSignalsWithoutOutcomes.length} signals without outcome records`,
        });
      }

    } catch (error) {
      console.error('❌ INVESTIGATION ERROR:', error);
      toast({
        title: "Investigation Error",
        description: "Failed to complete signal outcome investigation. Check console for details.",
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
        .channel('signal-status-audit')
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
              console.log('🔍 AUDIT: Signal status changed to expired:', payload);
              const signalId = payload.new?.id;
              
              if (!signalId) {
                console.warn('⚠️ AUDIT: No signal ID found in payload');
                return;
              }
              
              // Wait a moment for any outcome to be created
              setTimeout(async () => {
                try {
                  const hasOutcome = await auditSignalExpiration(signalId, 'Status changed to expired', 'Database trigger');
                  if (!hasOutcome) {
                    console.warn(`⚠️ AUDIT: Signal ${signalId} expired without outcome - needs investigation`);
                  }
                } catch (auditError) {
                  console.error(`❌ AUDIT ERROR for signal ${signalId}:`, auditError);
                }
              }, 2000);
            } catch (handlerError) {
              console.error('❌ AUDIT HANDLER ERROR:', handlerError);
            }
          }
        )
        .subscribe();
    } catch (subscriptionError) {
      console.error('❌ Failed to set up signal monitoring subscription:', subscriptionError);
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
