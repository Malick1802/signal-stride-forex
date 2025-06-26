import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSignalStatusManager } from './useSignalStatusManager';
import Logger from '@/utils/logger';

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
  trailingStopActive?: boolean;
  currentTrailingStop?: number;
}

export const useEnhancedSignalMonitoring = () => {
  const { toast } = useToast();
  const { expireSignalImmediately, validateSignalStatus } = useSignalStatusManager();
  const [stopLossConfirmations, setStopLossConfirmations] = useState<Record<string, {
    count: number, 
    firstDetectedAt: number,
    lastPrice: number
  }>>({});
  
  // Enhanced confirmation thresholds for pure outcome monitoring
  const STOP_LOSS_CONFIRMATION_THRESHOLD = 15000; // 15 seconds for faster response
  const STOP_LOSS_CONFIRMATION_COUNT = 2; // Reduced to 2 confirmations for efficiency
  
  // Trailing stop factor
  const TRAILING_STOP_FACTOR = 0.5;

  // Clear stale confirmations
  const clearStaleConfirmations = useCallback(() => {
    const now = Date.now();
    const updatedConfirmations = { ...stopLossConfirmations };
    let hasChanges = false;
    
    Object.keys(updatedConfirmations).forEach(signalId => {
      if (now - updatedConfirmations[signalId].firstDetectedAt > 60000) { // 1 minute max
        delete updatedConfirmations[signalId];
        hasChanges = true;
        Logger.debug('monitoring', `Clearing stale SL confirmation for ${signalId}`);
      }
    });
    
    if (hasChanges) {
      setStopLossConfirmations(updatedConfirmations);
    }
  }, [stopLossConfirmations]);

  // Calculate trailing stop
  const calculateTrailingStop = useCallback((
    signal: EnhancedSignalData, 
    currentPrice: number
  ): number | null => {
    if (!signal.targetsHit || signal.targetsHit.length === 0) {
      return null;
    }
    
    const tp1 = signal.takeProfits[0];
    const tpDistance = Math.abs(tp1 - signal.entryPrice);
    const trailingDistance = tpDistance * TRAILING_STOP_FACTOR;
    
    if (signal.type === 'BUY') {
      const calculatedStop = currentPrice - trailingDistance;
      return calculatedStop > signal.stopLoss ? calculatedStop : null;
    } else {
      const calculatedStop = currentPrice + trailingDistance;
      return calculatedStop < signal.stopLoss ? calculatedStop : null;
    }
  }, []);

  // Enhanced stop loss validation with pure outcome focus
  const validateStopLossHit = useCallback((
    signal: EnhancedSignalData, 
    currentPrice: number
  ): boolean => {
    if (!currentPrice || currentPrice <= 0) return false;

    const stopLossCrossed = signal.type === 'BUY' 
      ? currentPrice <= signal.stopLoss
      : currentPrice >= signal.stopLoss;
      
    if (!stopLossCrossed) {
      if (stopLossConfirmations[signal.id]) {
        setStopLossConfirmations(prevState => {
          const newState = { ...prevState };
          delete newState[signal.id];
          return newState;
        });
      }
      return false;
    }
    
    const now = Date.now();
    
    if (stopLossConfirmations[signal.id]) {
      const confirmation = stopLossConfirmations[signal.id];
      const newCount = confirmation.count + 1;
      
      setStopLossConfirmations(prevState => ({
        ...prevState,
        [signal.id]: {
          count: newCount,
          firstDetectedAt: confirmation.firstDetectedAt,
          lastPrice: currentPrice
        }
      }));
      
      const timeElapsed = now - confirmation.firstDetectedAt;
      const isTimeThresholdMet = timeElapsed >= STOP_LOSS_CONFIRMATION_THRESHOLD;
      const isCountThresholdMet = newCount >= STOP_LOSS_CONFIRMATION_COUNT;
      
      if (isCountThresholdMet && isTimeThresholdMet) {
        Logger.info('monitoring', `SL CONFIRMED: ${signal.symbol} ${signal.type} - Price: ${currentPrice}, SL: ${signal.stopLoss}`);
        
        setStopLossConfirmations(prevState => {
          const newState = { ...prevState };
          delete newState[signal.id];
          return newState;
        });
        
        return true;
      }
      
      return false;
    } else {
      Logger.debug('monitoring', `SL DETECTION: ${signal.symbol} ${signal.type} - Starting confirmation`);
      
      setStopLossConfirmations(prevState => ({
        ...prevState,
        [signal.id]: {
          count: 1,
          firstDetectedAt: now,
          lastPrice: currentPrice
        }
      }));
      
      return false;
    }
  }, [stopLossConfirmations]);

  // Take profit validation with pure outcome focus
  const validateTakeProfitHits = useCallback((
    signal: EnhancedSignalData, 
    currentPrice: number
  ): number[] => {
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
        
        Logger.info('monitoring', `TP HIT: ${signal.symbol} ${signal.type} TP${targetNumber}`);
      }
    }

    if (hasNewTargetHit) {
      newTargetsHit.sort();
    }

    return newTargetsHit;
  }, []);

  // Process signal outcome with IMMEDIATE expiration when conditions are met
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

      Logger.info('monitoring', `Processing outcome: ${signal.symbol} - SL: ${stopLossHit}, All TP: ${allTargetsHit}`);

      // PHASE 1 FIX: Always expire signal immediately when condition is met
      const reason = allTargetsHit ? 'all_targets_hit' : 'stop_loss_hit';
      const expireSuccess = await expireSignalImmediately(signal.id, reason, targetsHit);
      
      if (!expireSuccess) {
        Logger.error('monitoring', `Failed to expire signal ${signal.id}`);
        return;
      }

      // Create outcome record only if it doesn't exist
      const { data: existingOutcome } = await supabase
        .from('signal_outcomes')
        .select('id')
        .eq('signal_id', signal.id)
        .single();

      if (existingOutcome) {
        Logger.debug('monitoring', `Outcome exists for ${signal.id}, signal already expired`);
        return;
      }

      // Calculate pure market-based outcome
      let finalExitPrice = currentPrice;
      let isSuccessful = allTargetsHit;
      
      if (allTargetsHit) {
        const highestHitTarget = Math.max(...targetsHit);
        finalExitPrice = signal.takeProfits[highestHitTarget - 1];
      } else if (stopLossHit) {
        finalExitPrice = signal.stopLoss;
        isSuccessful = false;
      }

      // Calculate P&L
      let pnlPips = 0;
      if (signal.type === 'BUY') {
        pnlPips = Math.round((finalExitPrice - signal.entryPrice) * 10000);
      } else {
        pnlPips = Math.round((signal.entryPrice - finalExitPrice) * 10000);
      }

      // Determine outcome notes
      let outcomeNotes = '';
      if (allTargetsHit) {
        outcomeNotes = 'All Take Profits Hit (Enhanced Pure Outcome)';
      } else if (targetsHit.length > 0 && stopLossHit) {
        outcomeNotes = `Take Profit ${Math.max(...targetsHit)} Hit, Then Stop Loss (Enhanced Pure Outcome)`;
      } else if (targetsHit.length > 0) {
        outcomeNotes = `Take Profit ${Math.max(...targetsHit)} Hit (Enhanced Pure Outcome)`;
      } else {
        outcomeNotes = 'Stop Loss Hit (Enhanced Pure Outcome)';
      }

      // Create outcome record
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
        Logger.error('monitoring', `Failed to create outcome for ${signal.id}:`, outcomeError);
        return;
      }

      Logger.info('monitoring', `Created outcome for ${signal.id}: ${outcomeNotes} (${pnlPips} pips)`);

      // Show notification
      const notificationTitle = isSuccessful ? "🎯 Enhanced Pure Outcome Success!" : "⛔ Enhanced Pure Outcome Stop Loss";
      const notificationDescription = `${signal.symbol} ${signal.type} ${outcomeNotes} (${pnlPips >= 0 ? '+' : ''}${pnlPips} pips)`;
      
      toast({
        title: notificationTitle,
        description: notificationDescription,
        duration: 8000,
      });

    } catch (error) {
      Logger.error('monitoring', `Error processing outcome for ${signal.id}:`, error);
    }
  }, [toast, expireSignalImmediately]);

  // Enhanced monitoring with exclusive pure outcome control
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

      Logger.debug('monitoring', `Enhanced monitoring ${activeSignals.length} signals`);

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        Logger.debug('monitoring', 'No market data available');
        return;
      }

      // Create price lookup
      const currentPrices: Record<string, number> = {};
      marketData.forEach(data => {
        currentPrices[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Clear stale confirmations
      clearStaleConfirmations();

      // Process each signal with enhanced validation
      for (const signal of activeSignals) {
        const currentPrice = currentPrices[signal.symbol];
        if (!currentPrice) continue;

        const takeProfits = signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [];
        if (takeProfits.length === 0) {
          Logger.debug('monitoring', `Signal ${signal.id} has no take profits, skipping`);
          continue;
        }

        const enhancedSignal: EnhancedSignalData = {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type as 'BUY' | 'SELL',
          entryPrice: parseFloat(signal.price.toString()),
          stopLoss: parseFloat(signal.stop_loss.toString()),
          takeProfits: takeProfits,
          status: signal.status,
          createdAt: signal.created_at,
          targetsHit: signal.targets_hit || [],
          trailingStopActive: signal.targets_hit?.length > 0 || false,
          currentTrailingStop: undefined
        };

        // PHASE 3: Validate signal status before processing
        const statusValidation = await validateSignalStatus(signal.id);
        if (!statusValidation.isValid && statusValidation.shouldBeExpired) {
          Logger.warning('monitoring', `Fixing inconsistent signal status: ${statusValidation.reason}`);
          await expireSignalImmediately(signal.id, 'all_targets_hit', enhancedSignal.targetsHit);
          continue;
        }

        Logger.debug('monitoring', `Enhanced validating ${signal.symbol} - Current: ${currentPrice}, Entry: ${enhancedSignal.entryPrice}, SL: ${enhancedSignal.stopLoss}`);

        // Check take profits FIRST (priority over stop loss)
        const newTargetsHit = validateTakeProfitHits(enhancedSignal, currentPrice);

        // Update targets if new ones hit
        if (newTargetsHit.length !== enhancedSignal.targetsHit.length) {
          await supabase
            .from('trading_signals')
            .update({ 
              targets_hit: newTargetsHit,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          Logger.info('monitoring', `Updated targets for ${signal.symbol}:`, newTargetsHit);
          enhancedSignal.targetsHit = newTargetsHit;
          enhancedSignal.trailingStopActive = newTargetsHit.length > 0;
        }

        // Handle trailing stop after TP1
        if (enhancedSignal.trailingStopActive) {
          const newTrailingStop = calculateTrailingStop(enhancedSignal, currentPrice);
          
          if (newTrailingStop !== null) {
            const currentStop = enhancedSignal.currentTrailingStop || enhancedSignal.stopLoss;
            
            if ((enhancedSignal.type === 'BUY' && newTrailingStop > currentStop) ||
                (enhancedSignal.type === 'SELL' && newTrailingStop < currentStop)) {
              
              Logger.info('monitoring', `Trailing SL: ${signal.symbol} ${signal.type} - Moving SL from ${enhancedSignal.stopLoss} to ${newTrailingStop}`);
              
              await supabase
                .from('trading_signals')
                .update({ 
                  stop_loss: newTrailingStop,
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              enhancedSignal.stopLoss = newTrailingStop;
              enhancedSignal.currentTrailingStop = newTrailingStop;
            }
          }
        }

        // Check for stop loss with enhanced validation
        const stopLossHit = validateStopLossHit(enhancedSignal, currentPrice);

        // Process outcome if signal should expire (ENHANCED PURE MARKET BASED)
        await processSignalOutcome(enhancedSignal, currentPrice, stopLossHit, enhancedSignal.targetsHit);
      }

    } catch (error) {
      Logger.error('monitoring', 'Enhanced monitoring error:', error);
    }
  }, [validateStopLossHit, validateTakeProfitHits, processSignalOutcome, calculateTrailingStop, clearStaleConfirmations, expireSignalImmediately, validateSignalStatus]);

  useEffect(() => {
    // Initial monitoring
    monitorSignalsEnhanced();

    // Keep 3-second monitoring for maximum responsiveness
    const monitorInterval = setInterval(monitorSignalsEnhanced, 3000);

    // Real-time price update monitoring
    const priceChannel = supabase
      .channel('enhanced-pure-outcome-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          setTimeout(monitorSignalsEnhanced, 500);
        }
      )
      .subscribe();

    Logger.info('monitoring', 'Enhanced pure outcome monitoring active with immediate expiration');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorSignalsEnhanced]);

  return {
    monitorSignalsEnhanced
  };
};
