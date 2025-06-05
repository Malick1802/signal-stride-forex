
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedSignalData {
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

export const useEnhancedSignalMonitoring = () => {
  const { toast } = useToast();

  const validateStopLossHit = useCallback((signal: EnhancedSignalData, currentPrice: number): boolean => {
    if (!currentPrice || currentPrice <= 0) return false;

    const stopLossHit = signal.type === 'BUY' 
      ? currentPrice <= signal.stopLoss
      : currentPrice >= signal.stopLoss;

    if (stopLossHit) {
      console.log(`🎯 STOP LOSS VALIDATION: ${signal.symbol} ${signal.type} - Current: ${currentPrice}, SL: ${signal.stopLoss}, Entry: ${signal.entryPrice}`);
      console.log(`🔍 SL LOGIC: ${signal.type === 'BUY' ? `${currentPrice} <= ${signal.stopLoss}` : `${currentPrice} >= ${signal.stopLoss}`} = ${stopLossHit}`);
    }

    return stopLossHit;
  }, []);

  const validateTakeProfitHits = useCallback((signal: EnhancedSignalData, currentPrice: number): number[] => {
    if (!currentPrice || currentPrice <= 0) return signal.targetsHit;

    let newTargetsHit = [...signal.targetsHit];
    let hasNewTargetHit = false;

    for (let i = 0; i < signal.takeProfits.length; i++) {
      const tpPrice = signal.takeProfits[i];
      const targetNumber = i + 1;
      
      const tpHit = signal.type === 'BUY' 
        ? currentPrice >= tpPrice
        : currentPrice <= tpPrice;
      
      if (tpHit && !newTargetsHit.includes(targetNumber)) {
        newTargetsHit.push(targetNumber);
        hasNewTargetHit = true;
        
        console.log(`🎯 TAKE PROFIT VALIDATION: ${signal.symbol} ${signal.type} TP${targetNumber} HIT`);
        console.log(`🔍 TP LOGIC: ${signal.type === 'BUY' ? `${currentPrice} >= ${tpPrice}` : `${currentPrice} <= ${tpPrice}`} = ${tpHit}`);
      }
    }

    if (hasNewTargetHit) {
      newTargetsHit.sort();
    }

    return newTargetsHit;
  }, []);

  const processSignalOutcome = useCallback(async (
    signal: EnhancedSignalData, 
    currentPrice: number, 
    stopLossHit: boolean, 
    targetsHit: number[]
  ) => {
    try {
      const allTargetsHit = targetsHit.length === signal.takeProfits.length;
      const shouldExpire = stopLossHit || allTargetsHit;

      if (!shouldExpire) return;

      console.log(`🔄 ENHANCED PROCESSING: ${signal.symbol} expiration - SL Hit: ${stopLossHit}, All TP Hit: ${allTargetsHit}`);

      // Check if outcome already exists
      const { data: existingOutcome } = await supabase
        .from('signal_outcomes')
        .select('id')
        .eq('signal_id', signal.id)
        .single();

      if (existingOutcome) {
        console.log(`⚠️ ENHANCED: Outcome already exists for signal ${signal.id}, skipping`);
        return;
      }

      // Calculate final outcome
      let finalExitPrice = currentPrice;
      let isSuccessful = allTargetsHit;
      
      if (allTargetsHit) {
        const highestHitTarget = Math.max(...targetsHit);
        finalExitPrice = signal.takeProfits[highestHitTarget - 1];
      } else if (stopLossHit) {
        finalExitPrice = signal.stopLoss;
        isSuccessful = false;
      }

      // Calculate P&L in pips
      let pnlPips = 0;
      if (signal.type === 'BUY') {
        pnlPips = Math.round((finalExitPrice - signal.entryPrice) * 10000);
      } else {
        pnlPips = Math.round((signal.entryPrice - finalExitPrice) * 10000);
      }

      // Determine outcome notes
      let outcomeNotes = '';
      if (allTargetsHit) {
        outcomeNotes = 'All Take Profits Hit (Enhanced Market-Based Monitoring)';
      } else if (targetsHit.length > 0 && stopLossHit) {
        outcomeNotes = `Take Profit ${Math.max(...targetsHit)} Hit, Then Stop Loss (Enhanced Market-Based Monitoring)`;
      } else if (targetsHit.length > 0) {
        outcomeNotes = `Take Profit ${Math.max(...targetsHit)} Hit (Enhanced Market-Based Monitoring)`;
      } else {
        outcomeNotes = 'Stop Loss Hit (Enhanced Market-Based Monitoring)';
      }

      // Create outcome record FIRST
      const { error: outcomeError } = await supabase
        .from('signal_outcomes')
        .insert({
          signal_id: signal.id,
          hit_target: isSuccessful,
          exit_price: finalExitPrice,
          exit_timestamp: new Date().toISOString(),
          target_hit_level: targetsHit.length > 0 ? Math.max(...targetsHit) : null,
          pnl_pips: pnlPips,
          notes: outcomeNotes
        });

      if (outcomeError) {
        console.error(`❌ ENHANCED: Failed to create outcome for ${signal.id}:`, outcomeError);
        return;
      }

      console.log(`✅ ENHANCED: Outcome created for ${signal.id}: ${outcomeNotes} (${pnlPips} pips)`);

      // Update signal status AFTER outcome is created
      const { error: updateError } = await supabase
        .from('trading_signals')
        .update({ 
          status: 'expired',
          targets_hit: targetsHit,
          updated_at: new Date().toISOString()
        })
        .eq('id', signal.id);

      if (updateError) {
        console.error(`❌ ENHANCED: Failed to update signal status for ${signal.id}:`, updateError);
        return;
      }

      console.log(`🎯 ENHANCED EXPIRATION: Signal ${signal.id} (${signal.symbol}) expired successfully with outcome`);

      // Show notification
      const notificationTitle = isSuccessful ? "🎯 Enhanced Signal Success!" : "⛔ Enhanced Signal Stopped Out";
      const notificationDescription = `${signal.symbol} ${signal.type} ${outcomeNotes} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`;
      
      toast({
        title: notificationTitle,
        description: notificationDescription,
        duration: 8000,
      });

    } catch (error) {
      console.error(`❌ ENHANCED: Error processing outcome for ${signal.id}:`, error);
    }
  }, [toast]);

  const monitorSignalsEnhanced = useCallback(async () => {
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

      console.log(`🔍 ENHANCED MONITORING: ${activeSignals.length} active signals...`);

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        console.log('⚠️ ENHANCED: No market data available');
        return;
      }

      // Create price lookup
      const currentPrices: Record<string, number> = {};
      marketData.forEach(data => {
        currentPrices[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Process each signal with enhanced validation
      for (const signal of activeSignals) {
        const currentPrice = currentPrices[signal.symbol];
        if (!currentPrice) continue;

        const enhancedSignal: EnhancedSignalData = {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type as 'BUY' | 'SELL',
          entryPrice: parseFloat(signal.price.toString()),
          stopLoss: parseFloat(signal.stop_loss.toString()),
          takeProfits: signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [],
          status: signal.status,
          createdAt: signal.created_at,
          targetsHit: signal.targets_hit || []
        };

        console.log(`📊 ENHANCED VALIDATION: ${signal.symbol} - Current: ${currentPrice}, Entry: ${enhancedSignal.entryPrice}, SL: ${enhancedSignal.stopLoss}`);

        // Validate stop loss with enhanced logic
        const stopLossHit = validateStopLossHit(enhancedSignal, currentPrice);

        // Validate take profit hits with enhanced logic
        const newTargetsHit = validateTakeProfitHits(enhancedSignal, currentPrice);

        // Update targets if new ones were hit
        if (newTargetsHit.length !== enhancedSignal.targetsHit.length) {
          await supabase
            .from('trading_signals')
            .update({ 
              targets_hit: newTargetsHit,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          console.log(`✅ ENHANCED: Updated targets for ${signal.symbol}:`, newTargetsHit);
        }

        // Process outcome if signal should expire
        await processSignalOutcome(enhancedSignal, currentPrice, stopLossHit, newTargetsHit);
      }

    } catch (error) {
      console.error('❌ ENHANCED MONITORING ERROR:', error);
    }
  }, [validateStopLossHit, validateTakeProfitHits, processSignalOutcome]);

  useEffect(() => {
    // Initial monitoring
    monitorSignalsEnhanced();

    // Enhanced monitoring every 5 seconds for better responsiveness
    const monitorInterval = setInterval(monitorSignalsEnhanced, 5000);

    // Real-time price update monitoring
    const priceChannel = supabase
      .channel('enhanced-price-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          setTimeout(monitorSignalsEnhanced, 1000);
        }
      )
      .subscribe();

    console.log('🔄 ENHANCED monitoring system activated - 5-second intervals with real-time triggers');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorSignalsEnhanced]);

  return {
    monitorSignalsEnhanced
  };
};
