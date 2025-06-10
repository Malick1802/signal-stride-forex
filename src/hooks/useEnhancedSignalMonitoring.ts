
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
  
  const [proximityAlerts, setProximityAlerts] = useState<Record<string, {
    tpAlerts: number[],
    slAlert: boolean
  }>>({});
  
  // Time threshold for stop loss confirmation (in milliseconds)
  const STOP_LOSS_CONFIRMATION_THRESHOLD = 30000; // 30 seconds
  const STOP_LOSS_CONFIRMATION_COUNT = 3; // Need 3 confirmations
  
  // Factor for trailing stop - how much of the distance to first TP to use
  const TRAILING_STOP_FACTOR = 0.5;

  // Proximity thresholds in pips
  const TP_PROXIMITY_PIPS = 8;
  const SL_PROXIMITY_PIPS = 10;

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

  // Check proximity to take profit and stop loss levels
  const checkProximityAlerts = useCallback((signal: EnhancedSignalData, currentPrice: number) => {
    const currentProximity = proximityAlerts[signal.id] || { tpAlerts: [], slAlert: false };
    let hasNewAlert = false;

    // Check Take Profit proximity
    for (let i = 0; i < signal.takeProfits.length; i++) {
      const tpPrice = signal.takeProfits[i];
      const targetNumber = i + 1;
      
      // Skip if target already hit
      if (signal.targetsHit.includes(targetNumber)) continue;
      
      // Calculate distance in pips
      const pipMultiplier = signal.symbol.includes('JPY') ? 100 : 10000;
      let distancePips = 0;
      
      if (signal.type === 'BUY') {
        distancePips = Math.round((tpPrice - currentPrice) * pipMultiplier);
      } else {
        distancePips = Math.round((currentPrice - tpPrice) * pipMultiplier);
      }
      
      // Check if approaching TP (within threshold and not already alerted)
      if (distancePips > 0 && distancePips <= TP_PROXIMITY_PIPS && !currentProximity.tpAlerts.includes(targetNumber)) {
        currentProximity.tpAlerts.push(targetNumber);
        hasNewAlert = true;
        
        toast({
          title: `🎯 Approaching Target ${targetNumber}!`,
          description: `${signal.symbol} ${signal.type} is ${distancePips} pips away from TP${targetNumber} (${tpPrice.toFixed(5)})`,
          duration: 6000,
        });
        
        console.log(`🎯 PROXIMITY ALERT: ${signal.symbol} approaching TP${targetNumber} - ${distancePips} pips away`);
      }
    }

    // Check Stop Loss proximity
    const pipMultiplier = signal.symbol.includes('JPY') ? 100 : 10000;
    let slDistancePips = 0;
    
    if (signal.type === 'BUY') {
      slDistancePips = Math.round((currentPrice - signal.stopLoss) * pipMultiplier);
    } else {
      slDistancePips = Math.round((signal.stopLoss - currentPrice) * pipMultiplier);
    }
    
    // Check if approaching SL (within threshold and not already alerted)
    if (slDistancePips > 0 && slDistancePips <= SL_PROXIMITY_PIPS && !currentProximity.slAlert) {
      currentProximity.slAlert = true;
      hasNewAlert = true;
      
      toast({
        title: `⚠️ Approaching Stop Loss!`,
        description: `${signal.symbol} ${signal.type} is ${slDistancePips} pips away from SL (${signal.stopLoss.toFixed(5)})`,
        duration: 8000,
      });
      
      console.log(`⚠️ PROXIMITY ALERT: ${signal.symbol} approaching SL - ${slDistancePips} pips away`);
    }

    if (hasNewAlert) {
      setProximityAlerts(prev => ({
        ...prev,
        [signal.id]: currentProximity
      }));
    }
  }, [proximityAlerts, toast]);

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

  // Take profit validation logic with enhanced notifications
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
        
        // Calculate pip gain for this target
        const pipMultiplier = signal.symbol.includes('JPY') ? 100 : 10000;
        let pipGain = 0;
        
        if (signal.type === 'BUY') {
          pipGain = Math.round((tpPrice - signal.entryPrice) * pipMultiplier);
        } else {
          pipGain = Math.round((signal.entryPrice - tpPrice) * pipMultiplier);
        }
        
        // Enhanced notification with pip gains and progress
        const totalTargets = signal.takeProfits.length;
        const progress = `${newTargetsHit.length}/${totalTargets}`;
        
        toast({
          title: `🎯 Target ${targetNumber} Hit!`,
          description: `${signal.symbol} ${signal.type} reached TP${targetNumber} (+${pipGain} pips) - Progress: ${progress} targets`,
          duration: 8000,
        });
        
        console.log(`🎯 TAKE PROFIT HIT: ${signal.symbol} ${signal.type} TP${targetNumber} (+${pipGain} pips)`);
        console.log(`🔍 TP LOGIC: ${signal.type === 'BUY' ? `${currentPrice} >= ${tpPrice}` : `${currentPrice} <= ${tpPrice}`} = ${tpHit}`);
        
        // Special notification for first target (trailing stop activation)
        if (targetNumber === 1) {
          setTimeout(() => {
            toast({
              title: `🔄 Trailing Stop Activated!`,
              description: `${signal.symbol} ${signal.type} trailing stop is now active after TP1 hit`,
              duration: 6000,
            });
          }, 2000);
        }
        
        // Special notification for final target
        if (newTargetsHit.length === totalTargets) {
          setTimeout(() => {
            toast({
              title: `🏆 All Targets Hit!`,
              description: `${signal.symbol} ${signal.type} achieved maximum profit - all ${totalTargets} targets completed`,
              duration: 10000,
            });
          }, 3000);
        }
      }
    }

    if (hasNewTargetHit) {
      newTargetsHit.sort();
    }

    return newTargetsHit;
  }, [toast]);

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

      // Enhanced final notification with detailed results
      const notificationTitle = isSuccessful ? "🎯 Signal Completed Successfully!" : "⛔ Signal Stopped Out";
      let notificationDescription = `${signal.symbol} ${signal.type} ${outcomeNotes}`;
      
      if (isSuccessful && targetsHit.length > 0) {
        notificationDescription += ` - Final Result: +${pnlPips} pips (${targetsHit.length}/${signal.takeProfits.length} targets)`;
      } else {
        notificationDescription += ` - Loss: ${pnlPips} pips`;
      }
      
      toast({
        title: notificationTitle,
        description: notificationDescription,
        duration: 12000,
      });

      // Clear proximity alerts for this signal
      setProximityAlerts(prev => {
        const newState = { ...prev };
        delete newState[signal.id];
        return newState;
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

        // Check proximity alerts for approaching TP/SL levels
        checkProximityAlerts(enhancedSignal, currentPrice);

        // IMPORTANT: Check take profits BEFORE stop loss to prioritize profits
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
              
              // Calculate pip improvement
              const pipMultiplier = signal.symbol.includes('JPY') ? 100 : 10000;
              const pipImprovement = Math.abs(Math.round((newTrailingStop - enhancedSignal.stopLoss) * pipMultiplier));
              
              // Notification for trailing stop update
              toast({
                title: `🔄 Trailing Stop Updated!`,
                description: `${signal.symbol} ${signal.type} stop loss moved ${pipImprovement} pips in your favor to ${newTrailingStop.toFixed(5)}`,
                duration: 6000,
              });
              
              // Update stop loss in database
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
  }, [validateStopLossHit, validateTakeProfitHits, processSignalOutcome, calculateTrailingStop, clearStaleConfirmations, checkProximityAlerts]);

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

    console.log('🔄 ENHANCED monitoring system activated with comprehensive notifications');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorSignalsEnhanced]);

  return {
    monitorSignalsEnhanced
  };
};
