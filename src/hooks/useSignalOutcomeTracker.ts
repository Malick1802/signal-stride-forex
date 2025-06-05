
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
      
      // Check if outcome already exists
      const { data: existingOutcome } = await supabase
        .from('signal_outcomes')
        .select('id, notes')
        .eq('signal_id', signalId)
        .single();

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

      // Find expired signals without outcomes
      const { data: expiredSignalsWithoutOutcomes, error } = await supabase
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
        .eq('status', 'expired')
        .not('id', 'in', `(
          SELECT signal_id FROM signal_outcomes WHERE signal_id IS NOT NULL
        )`);

      if (error) {
        console.error('❌ INVESTIGATION ERROR:', error);
        return;
      }

      if (!expiredSignalsWithoutOutcomes || expiredSignalsWithoutOutcomes.length === 0) {
        console.log('✅ INVESTIGATION: All expired signals have outcome records');
        return;
      }

      console.warn(`⚠️ INVESTIGATION: Found ${expiredSignalsWithoutOutcomes.length} expired signals WITHOUT outcome records`);

      // Get current market prices for these signals
      const symbols = [...new Set(expiredSignalsWithoutOutcomes.map(s => s.symbol))];
      const { data: marketData } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      const priceMap: Record<string, number> = {};
      marketData?.forEach(data => {
        priceMap[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Repair each signal without outcome
      for (const signal of expiredSignalsWithoutOutcomes) {
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

        await ensureOutcomeForExpiredSignal(signalData);
      }

      toast({
        title: "Investigation Complete",
        description: `Repaired ${expiredSignalsWithoutOutcomes.length} signals without outcome records`,
      });

    } catch (error) {
      console.error('❌ INVESTIGATION ERROR:', error);
    }
  }, [ensureOutcomeForExpiredSignal, toast]);

  useEffect(() => {
    // Run investigation immediately
    investigateExpiredSignalsWithoutOutcomes();

    // Set up monitoring for signal status changes
    const signalStatusChannel = supabase
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
          console.log('🔍 AUDIT: Signal status changed to expired:', payload);
          const signalId = payload.new.id;
          
          // Wait a moment for any outcome to be created
          setTimeout(async () => {
            const hasOutcome = await auditSignalExpiration(signalId, 'Status changed to expired', 'Database trigger');
            if (!hasOutcome) {
              console.warn(`⚠️ AUDIT: Signal ${signalId} expired without outcome - needs investigation`);
            }
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalStatusChannel);
    };
  }, [investigateExpiredSignalsWithoutOutcomes, auditSignalExpiration]);

  return {
    investigateExpiredSignalsWithoutOutcomes,
    auditSignalExpiration,
    ensureOutcomeForExpiredSignal
  };
};
