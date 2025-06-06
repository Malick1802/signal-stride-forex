
import { useEffect, useCallback, useState } from 'react';
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
  trailingStopActive?: boolean;
  currentTrailingStop?: number;
}

export const useEnhancedSignalMonitoring = () => {
  const { toast } = useToast();
  const [stopLossConfirmations, setStopLossConfirmations] = useState<Record<string, {
    count: number, 
    firstDetectedAt: number,
    lastPrice: number
  }>>({});
  
  // Time threshold for stop loss confirmation (in milliseconds)
  const STOP_LOSS_CONFIRMATION_THRESHOLD = 30000; // 30 seconds
  const STOP_LOSS_CONFIRMATION_COUNT = 3; // Need 3 confirmations
  
  // Factor for trailing stop - how much of the distance to first TP to use
  const TRAILING_STOP_FACTOR = 0.5;

  // Clear stale confirmations older than 2 minutes
  const clearStaleConfirmations = useCallback(() => {
    const now = Date.now();
    const updatedConfirmations = { ...stopLossConfirmations };
    let hasChanges = false;
    
    Object.keys(updatedConfirmations).forEach(signalId => {
      if (now - updatedConfirmations[signalId].firstDetectedAt > 120000) {
        delete updatedConfirmations[signalId];
        hasChanges = true;
        console.log(`🧹 Clearing stale SL confirmation for ${signalId} (older than 2 minutes)`);
      }
    });
    
    if (hasChanges) {
      setStopLossConfirmations(updatedConfirmations);
    }
  }, [stopLossConfirmations]);

  // Calculate and activate trailing stop once TP1 is hit
  const calculateTrailingStop = useCallback((
    signal: EnhancedSignalData, 
    currentPrice: number
  ): number | null => {
    // Only activate trailing stop if at least TP1 is hit
    if (!signal.targetsHit || signal.targetsHit.length === 0) {
      return null;
    }
    
    // Get first take profit level
    const tp1 = signal.takeProfits[0];
    
    // Calculate the trailing stop based on the entry and TP1 distance
    const tpDistance = Math.abs(tp1 - signal.entryPrice);
    const trailingDistance = tpDistance * TRAILING_STOP_FACTOR;
    
    // Calculate trailing stop position based on signal type
    if (signal.type === 'BUY') {
      // For buy signals, trailing stop follows price up
      const calculatedStop = currentPrice - trailingDistance;
      
      // Only return if it's higher than current stop loss (moved up)
      return calculatedStop > signal.stopLoss ? calculatedStop : null;
    } else {
      // For sell signals, trailing stop follows price down
      const calculatedStop = currentPrice + trailingDistance;
      
      // Only return if it's lower than current stop loss (moved down)
      return calculatedStop < signal.stopLoss ? calculatedStop : null;
    }
  }, []);

  // Enhanced stop loss validation with confirmation and volatility consideration
  const validateStopLossHit = useCallback((
    signal: EnhancedSignalData, 
    currentPrice: number
  ): boolean => {
    if (!currentPrice || currentPrice <= 0) return false;

    // Calculate whether price crossed the stop loss level
    const stopLossCrossed = signal.type === 'BUY' 
      ? currentPrice <= signal.stopLoss
      : currentPrice >= signal.stopLoss;
      
    if (!stopLossCrossed) {
      // If the stop loss isn't crossed, remove any existing confirmation
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
    
    // Check if we're already tracking this signal
    if (stopLossConfirmations[signal.id]) {
      const confirmation = stopLossConfirmations[signal.id];
      const newCount = confirmation.count + 1;
      
      // Update confirmation with new count and price
      setStopLossConfirmations(prevState => ({
        ...prevState,
        [signal.id]: {
          count: newCount,
          firstDetectedAt: confirmation.firstDetectedAt,
          lastPrice: currentPrice
        }
      }));
      
      // Check if we have enough confirmations AND enough time has passed
      const timeElapsed = now - confirmation.firstDetectedAt;
      const isTimeThresholdMet = timeElapsed >= STOP_LOSS_CONFIRMATION_THRESHOLD;
      const isCountThresholdMet = newCount >= STOP_LOSS_CONFIRMATION_COUNT;
      
      if (isCountThresholdMet && isTimeThresholdMet) {
        console.log(`✅ ENHANCED SL CONFIRMED: ${signal.symbol} ${signal.type} - Current: ${currentPrice}, SL: ${signal.stopLoss}`);
        console.log(`🔍 SL CONFIRMATION: ${newCount} confirmations over ${Math.round(timeElapsed / 1000)}s`);
        
        // Clear the confirmation since we're going to process it
        setStopLossConfirmations(prevState => {
          const newState = { ...prevState };
          delete newState[signal.id];
          return newState;
        });
        
        return true;
      }
      
      return false;
    } else {
      // Start tracking this confirmation
      console.log(`⚠️ POTENTIAL SL: ${signal.symbol} ${signal.type} - Current: ${currentPrice}, SL: ${signal.stopLoss}`);
      console.log(`🔍 Starting SL confirmation for ${signal.id} (${signal.symbol})`);
      
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

  // Take profit validation logic with priority over stop loss
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

      // Clear stale stop loss confirmations
      clearStaleConfirmations();

      // Process each signal with enhanced validation
      for (const signal of activeSignals) {
        const currentPrice = currentPrices[signal.symbol];
        if (!currentPrice) continue;

        // Parse take profits array and ensure it's valid
        const takeProfits = signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [];
        if (takeProfits.length === 0) {
          console.warn(`⚠️ Signal ${signal.id} has no take profits defined, skipping`);
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
          // Safely handle the missing trailing_stop column for now
          currentTrailingStop: undefined
        };

        console.log(`📊 ENHANCED VALIDATION: ${signal.symbol} - Current: ${currentPrice}, Entry: ${enhancedSignal.entryPrice}, SL: ${enhancedSignal.stopLoss}`);

        // IMPORTANT: Check take profits BEFORE stop loss to prioritize profits
        // This is a key change to improve profitability
        const newTargetsHit = validateTakeProfitHits(enhancedSignal, currentPrice);

        // If we hit any new targets, update them first
        if (newTargetsHit.length !== enhancedSignal.targetsHit.length) {
          await supabase
            .from('trading_signals')
            .update({ 
              targets_hit: newTargetsHit,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          console.log(`✅ ENHANCED: Updated targets for ${signal.symbol}:`, newTargetsHit);
          
          // Update our signal object for further processing
          enhancedSignal.targetsHit = newTargetsHit;
          enhancedSignal.trailingStopActive = newTargetsHit.length > 0;
        }

        // After hitting TP1, activate trailing stop if applicable
        if (enhancedSignal.trailingStopActive) {
          const newTrailingStop = calculateTrailingStop(enhancedSignal, currentPrice);
          
          if (newTrailingStop !== null) {
            // Only update if we have a valid new trailing stop level
            const currentStop = enhancedSignal.currentTrailingStop || enhancedSignal.stopLoss;
            
            if ((enhancedSignal.type === 'BUY' && newTrailingStop > currentStop) ||
                (enhancedSignal.type === 'SELL' && newTrailingStop < currentStop)) {
              
              console.log(`🔄 TRAILING STOP: ${signal.symbol} ${signal.type} - Moving stop loss from ${enhancedSignal.stopLoss} to ${newTrailingStop}`);
              
              // Update stop loss in database (we'll add trailing_stop column later)
              await supabase
                .from('trading_signals')
                .update({ 
                  stop_loss: newTrailingStop,
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              // Update our local signal object with new stop loss
              enhancedSignal.stopLoss = newTrailingStop;
              enhancedSignal.currentTrailingStop = newTrailingStop;
            }
          }
        }

        // NOW check for stop loss hit with enhanced validation
        const stopLossHit = validateStopLossHit(enhancedSignal, currentPrice);

        // Process outcome if signal should expire
        await processSignalOutcome(enhancedSignal, currentPrice, stopLossHit, enhancedSignal.targetsHit);
      }

    } catch (error) {
      console.error('❌ ENHANCED MONITORING ERROR:', error);
    }
  }, [validateStopLossHit, validateTakeProfitHits, processSignalOutcome, calculateTrailingStop, clearStaleConfirmations]);

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

    console.log('🔄 ENHANCED monitoring system activated with trailing stops and improved validation');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorSignalsEnhanced]);

  return {
    monitorSignalsEnhanced
  };
};
