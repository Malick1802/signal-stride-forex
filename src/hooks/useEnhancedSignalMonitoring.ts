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
  const { expireSignalImmediately, validateSignalStatus, forceExpireCompletedSignals } = useSignalStatusManager();
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

    // Directional sanity check: ignore invalid SL configurations
    if ((signal.type === 'BUY' && signal.stopLoss >= signal.entryPrice) ||
        (signal.type === 'SELL' && signal.stopLoss <= signal.entryPrice)) {
      Logger.warn('monitoring', `Ignoring invalid SL direction for ${signal.symbol} ${signal.type} (entry ${signal.entryPrice}, SL ${signal.stopLoss})`);
      return false;
    }

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

  // FIXED: Take profit validation with CORRECT directional logic
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
      
      // CRITICAL FIX: Correct directional logic for take profit hits
      let tpHit = false;
      if (signal.type === 'BUY') {
        // BUY signals: TP hit only when current price is ABOVE (>=) TP level
        tpHit = currentPrice >= tpPrice;
      } else {
        // SELL signals: TP hit only when current price is BELOW (<=) TP level  
        tpHit = currentPrice <= tpPrice;
      }
      
      if (tpHit && !newTargetsHit.includes(targetNumber)) {
        // VALIDATION: Ensure the hit makes logical sense
        const pipsGained = signal.type === 'BUY' 
          ? Math.round((tpPrice - signal.entryPrice) * 10000)
          : Math.round((signal.entryPrice - tpPrice) * 10000);
        
        // Only mark as hit if pips are positive (profitable)
        if (pipsGained > 0) {
          newTargetsHit.push(targetNumber);
          hasNewTargetHit = true;
          
          Logger.info('monitoring', `TP HIT VALIDATED: ${signal.symbol} ${signal.type} TP${targetNumber} - Entry: ${signal.entryPrice}, TP: ${tpPrice}, Current: ${currentPrice}, Pips: +${pipsGained}`);
        } else {
          Logger.warn('monitoring', `TP HIT REJECTED: ${signal.symbol} ${signal.type} TP${targetNumber} would be negative pips: ${pipsGained}`);
        }
      }
    }

    if (hasNewTargetHit) {
      newTargetsHit.sort();
    }

    return newTargetsHit;
  }, []);

  // FIXED: Process signal outcome with validation to prevent negative pip wins
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
      const reason = stopLossHit ? 'stop_loss_hit' : 'all_targets_hit';
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

      // VALIDATION FIX: Calculate outcome with proper validation
      let finalExitPrice = currentPrice;
      let isSuccessful = false;
      let outcomeNotes = '';
      
      if (stopLossHit) {
        finalExitPrice = signal.stopLoss;
        isSuccessful = false;
        outcomeNotes = 'Stop Loss Hit (Enhanced Validated)';
      } else if (allTargetsHit || targetsHit.length > 0) {
        const highestHitTarget = Math.max(...targetsHit);
        finalExitPrice = signal.takeProfits[highestHitTarget - 1];
        
        // CRITICAL VALIDATION: Verify this is actually profitable
        const pnlPips = signal.type === 'BUY' 
          ? Math.round((finalExitPrice - signal.entryPrice) * 10000)
          : Math.round((signal.entryPrice - finalExitPrice) * 10000);
        
        // Only mark as successful if pips are positive
        if (pnlPips > 0) {
          isSuccessful = true;
          outcomeNotes = allTargetsHit 
            ? 'All Take Profits Hit (Enhanced Validated)' 
            : `Take Profit ${highestHitTarget} Hit (Enhanced Validated)`;
        } else {
          // This should not happen with our fixed logic, but safeguard
          isSuccessful = false;
          finalExitPrice = signal.stopLoss;
          outcomeNotes = `Invalid TP Hit Detected - Stop Loss Applied (${pnlPips} pips)`;
          Logger.error('monitoring', `Invalid TP hit for ${signal.id}: ${pnlPips} pips`);
        }
      }

      // Calculate final P&L with validation
      let pnlPips = 0;
      if (signal.type === 'BUY') {
        pnlPips = Math.round((finalExitPrice - signal.entryPrice) * 10000);
      } else {
        pnlPips = Math.round((signal.entryPrice - finalExitPrice) * 10000);
      }

      // FINAL VALIDATION: Ensure successful signals have positive pips
      if (isSuccessful && pnlPips <= 0) {
        Logger.error('monitoring', `VALIDATION FAILED: Successful signal ${signal.id} has negative pips: ${pnlPips}`);
        isSuccessful = false;
        finalExitPrice = signal.stopLoss;
        pnlPips = signal.type === 'BUY' 
          ? Math.round((signal.stopLoss - signal.entryPrice) * 10000)
          : Math.round((signal.entryPrice - signal.stopLoss) * 10000);
        outcomeNotes = 'Validation Failed - Stop Loss Applied';
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

      Logger.info('monitoring', `Created VALIDATED outcome for ${signal.id}: ${outcomeNotes} (${pnlPips} pips)`);

      // Show notification
      const notificationTitle = isSuccessful ? "🎯 Enhanced Validated Success!" : "⛔ Enhanced Validated Stop Loss";
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
        Logger.debug('monitoring', 'No active signals found for enhanced monitoring');
        return;
      }

      Logger.info('monitoring', `🔍 Enhanced monitoring ${activeSignals.length} active signals`);

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

        // CRITICAL FIX: Check for invalid stop loss configurations and fix them
        const isInvalidStopLoss = (enhancedSignal.type === 'BUY' && enhancedSignal.stopLoss >= enhancedSignal.entryPrice) ||
                                  (enhancedSignal.type === 'SELL' && enhancedSignal.stopLoss <= enhancedSignal.entryPrice);
        
        if (isInvalidStopLoss) {
          Logger.error('monitoring', `🚨 INVALID SL CONFIG: ${signal.symbol} ${signal.type} - Entry: ${enhancedSignal.entryPrice}, SL: ${enhancedSignal.stopLoss}`);
          
          // Force expire this signal immediately as it has invalid configuration
          await expireSignalImmediately(signal.id, 'stop_loss_hit', enhancedSignal.targetsHit);
          continue;
        }

        // PHASE 3: Validate signal status before processing
        const statusValidation = await validateSignalStatus(signal.id);
        if (!statusValidation.isValid && statusValidation.shouldBeExpired) {
          Logger.warn('monitoring', `Fixing inconsistent signal status: ${statusValidation.reason}`);
          await expireSignalImmediately(signal.id, 'all_targets_hit', enhancedSignal.targetsHit);
          continue;
        }

        Logger.debug('monitoring', `✅ Monitoring ${signal.symbol} ${signal.type} - Current: ${currentPrice}, Entry: ${enhancedSignal.entryPrice}, SL: ${enhancedSignal.stopLoss}, TPs: ${enhancedSignal.takeProfits.join('/')}, TargetsHit: [${enhancedSignal.targetsHit.join(',')}]`);

        // Check take profits FIRST (priority over stop loss) with FIXED validation
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

          Logger.info('monitoring', `Updated VALIDATED targets for ${signal.symbol}:`, newTargetsHit);
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

        // Process outcome if signal should expire (ENHANCED VALIDATED)
        await processSignalOutcome(enhancedSignal, currentPrice, stopLossHit, enhancedSignal.targetsHit);
      }

    } catch (error) {
      Logger.error('monitoring', 'Enhanced monitoring error:', error);
    }
  }, [validateStopLossHit, validateTakeProfitHits, processSignalOutcome, calculateTrailingStop, clearStaleConfirmations, expireSignalImmediately, validateSignalStatus]);

  useEffect(() => {
    // Initial repair of invalid signals and status inconsistencies
    const performInitialRepair = async () => {
      const repairResult = await forceExpireCompletedSignals();
      if (repairResult.repaired > 0) {
        Logger.info('monitoring', `🔧 Initial repair completed: ${repairResult.repaired} signals fixed`);
      }
    };
    
    performInitialRepair();
    
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

    Logger.info('monitoring', 'Enhanced VALIDATED outcome monitoring active with immediate expiration');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorSignalsEnhanced, forceExpireCompletedSignals]);

  return {
    monitorSignalsEnhanced
  };
};
