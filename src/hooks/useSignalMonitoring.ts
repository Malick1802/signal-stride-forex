
import { useEffect, useCallback, useState } from 'react';
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
  createdAt: string;
  targetsHit: number[];
}

export const useSignalMonitoring = () => {
  const { toast } = useToast();
  const [marketStatus, setMarketStatus] = useState<Record<string, boolean>>({});
  const [lastPriceAlerts, setLastPriceAlerts] = useState<Record<string, number>>({});

  // Check market session status for major pairs
  const checkMarketStatus = useCallback((symbol: string): boolean => {
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Major forex market sessions (UTC):
    // Sydney: 21:00-06:00, Tokyo: 00:00-09:00, London: 08:00-17:00, New York: 13:00-22:00
    const isMarketOpen = (hour >= 0 && hour <= 22) || hour === 23; // Most sessions overlap
    
    const wasOpen = marketStatus[symbol];
    if (wasOpen !== undefined && wasOpen !== isMarketOpen) {
      // Market status changed
      toast({
        title: isMarketOpen ? "🟢 Market Opened" : "🔴 Market Closed",
        description: `${symbol} trading session ${isMarketOpen ? 'started' : 'ended'}`,
        duration: 6000,
      });
    }
    
    setMarketStatus(prev => ({ ...prev, [symbol]: isMarketOpen }));
    return isMarketOpen;
  }, [marketStatus, toast]);

  // Check for significant price movements
  const checkSignificantMovement = useCallback((signal: SignalToMonitor, currentPrice: number) => {
    const lastAlertPrice = lastPriceAlerts[signal.id];
    if (!lastAlertPrice) {
      setLastPriceAlerts(prev => ({ ...prev, [signal.id]: currentPrice }));
      return;
    }
    
    const pipMultiplier = signal.symbol.includes('JPY') ? 100 : 10000;
    const movementPips = Math.abs(Math.round((currentPrice - lastAlertPrice) * pipMultiplier));
    
    // Alert on significant movements (15+ pips)
    if (movementPips >= 15) {
      const direction = currentPrice > lastAlertPrice ? 'up' : 'down';
      const favorability = (signal.type === 'BUY' && direction === 'up') || 
                          (signal.type === 'SELL' && direction === 'down') ? 'favorable' : 'unfavorable';
      
      const emoji = favorability === 'favorable' ? '📈' : '📉';
      const colorClass = favorability === 'favorable' ? 'emerald' : 'orange';
      
      toast({
        title: `${emoji} Significant Price Movement`,
        description: `${signal.symbol} moved ${movementPips} pips ${direction} (${favorability} for your ${signal.type} signal)`,
        duration: 8000,
      });
      
      setLastPriceAlerts(prev => ({ ...prev, [signal.id]: currentPrice }));
    }
  }, [lastPriceAlerts, toast]);

  const checkSignalOutcomes = useCallback(async (signals: SignalToMonitor[], currentPrices: Record<string, number>) => {
    for (const signal of signals) {
      if (signal.status !== 'active') continue;
      
      const currentPrice = currentPrices[signal.symbol];
      if (!currentPrice) continue;

      // Check market status
      const isMarketOpen = checkMarketStatus(signal.symbol);
      
      // Check for significant price movements
      checkSignificantMovement(signal, currentPrice);

      console.log(`📊 OUTCOME MONITORING ${signal.symbol}: Current ${currentPrice}, Entry ${signal.entryPrice}, SL ${signal.stopLoss}`);

      let hitStopLoss = false;
      let newTargetsHit = [...signal.targetsHit];
      let hasNewTargetHit = false;

      // Check stop loss hit first
      if (signal.type === 'BUY') {
        hitStopLoss = currentPrice <= signal.stopLoss;
      } else {
        hitStopLoss = currentPrice >= signal.stopLoss;
      }

      // Check take profit hits and update targets_hit array
      if (!hitStopLoss && signal.takeProfits.length > 0) {
        for (let i = 0; i < signal.takeProfits.length; i++) {
          const tpPrice = signal.takeProfits[i];
          const targetNumber = i + 1;
          let tpHit = false;
          
          if (signal.type === 'BUY') {
            tpHit = currentPrice >= tpPrice;
          } else {
            tpHit = currentPrice <= tpPrice;
          }
          
          // If target hit and not already recorded, add to array
          if (tpHit && !newTargetsHit.includes(targetNumber)) {
            newTargetsHit.push(targetNumber);
            newTargetsHit.sort();
            hasNewTargetHit = true;
            
            // Calculate pip gain
            const pipMultiplier = signal.symbol.includes('JPY') ? 100 : 10000;
            let pipGain = 0;
            
            if (signal.type === 'BUY') {
              pipGain = Math.round((tpPrice - signal.entryPrice) * pipMultiplier);
            } else {
              pipGain = Math.round((signal.entryPrice - tpPrice) * pipMultiplier);
            }
            
            console.log(`🎯 TARGET ${targetNumber} HIT for ${signal.symbol}! Market-based detection (+${pipGain} pips)`);
            
            // Enhanced target hit notification with context
            const progress = `${newTargetsHit.length}/${signal.takeProfits.length}`;
            toast({
              title: `🎯 Target ${targetNumber} Hit!`,
              description: `${signal.symbol} ${signal.type} reached TP${targetNumber} (+${pipGain} pips) - Progress: ${progress}`,
              duration: 8000,
            });
            
            // Special notifications for milestones
            if (targetNumber === 1) {
              setTimeout(() => {
                toast({
                  title: `🔓 First Target Secured!`,
                  description: `${signal.symbol} ${signal.type} - Risk reduced, trailing stop may activate`,
                  duration: 6000,
                });
              }, 2000);
            }
            
            if (newTargetsHit.length === signal.takeProfits.length) {
              setTimeout(() => {
                toast({
                  title: `🏆 Perfect Execution!`,
                  description: `${signal.symbol} ${signal.type} hit all ${signal.takeProfits.length} take profit targets`,
                  duration: 10000,
                });
              }, 3000);
            }
          }
        }
      }

      // Update targets_hit array if new targets were hit
      if (hasNewTargetHit) {
        try {
          const { error: updateError } = await supabase
            .from('trading_signals')
            .update({ 
              targets_hit: newTargetsHit,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (updateError) {
            console.error('❌ Error updating targets_hit:', updateError);
          } else {
            console.log(`✅ Market-based targets_hit update for ${signal.symbol}:`, newTargetsHit);
          }
        } catch (error) {
          console.error('❌ Error updating signal targets:', error);
        }
      }

      // Check if signal should be expired (all targets hit OR stop loss hit)
      const allTargetsHit = newTargetsHit.length === signal.takeProfits.length;
      if (hitStopLoss || allTargetsHit) {
        try {
          console.log(`🔄 MARKET-BASED EXPIRATION for ${signal.symbol}: ${allTargetsHit ? 'ALL TARGETS HIT' : 'STOP LOSS HIT'}`);
          
          // Calculate final exit price and P&L
          let finalExitPrice = currentPrice;
          let isSuccessful = allTargetsHit;
          
          if (allTargetsHit) {
            // Use the highest hit target price
            const highestHitTarget = Math.max(...newTargetsHit);
            finalExitPrice = signal.takeProfits[highestHitTarget - 1];
          } else if (hitStopLoss) {
            finalExitPrice = signal.stopLoss;
            isSuccessful = false;
          }
          
          let pnlPips = 0;
          if (signal.type === 'BUY') {
            pnlPips = Math.round((finalExitPrice - signal.entryPrice) * 10000);
          } else {
            pnlPips = Math.round((signal.entryPrice - finalExitPrice) * 10000);
          }

          // Determine final outcome status
          let finalStatus = '';
          if (allTargetsHit) {
            finalStatus = 'All Take Profits Hit (Market-Based Outcome)';
          } else if (newTargetsHit.length > 0 && hitStopLoss) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit, Then Stop Loss (Market-Based Outcome)`;
          } else if (newTargetsHit.length > 0) {
            finalStatus = `Take Profit ${Math.max(...newTargetsHit)} Hit (Market-Based Outcome)`;
          } else {
            finalStatus = 'Stop Loss Hit (Market-Based Outcome)';
          }

          // Check if outcome already exists to prevent duplicates
          const { data: existingOutcome } = await supabase
            .from('signal_outcomes')
            .select('id')
            .eq('signal_id', signal.id)
            .single();

          if (existingOutcome) {
            console.log(`⚠️ Outcome already exists for signal ${signal.id}, skipping`);
            continue;
          }

          // Create signal outcome record
          const { error: outcomeError } = await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: signal.id,
              hit_target: isSuccessful,
              exit_price: finalExitPrice,
              exit_timestamp: new Date().toISOString(),
              target_hit_level: newTargetsHit.length > 0 ? Math.max(...newTargetsHit) : null,
              pnl_pips: pnlPips,
              notes: finalStatus
            });

          if (outcomeError) {
            console.error('❌ Error creating market-based signal outcome:', outcomeError);
            continue;
          }

          // Update signal status to expired
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

          console.log(`✅ MARKET-BASED COMPLETION: Signal ${signal.id} completed with outcome: ${isSuccessful ? 'SUCCESS' : 'LOSS'} (${pnlPips} pips)`);
          
          // Enhanced final notification with detailed analysis
          const notificationTitle = isSuccessful ? "🎯 Signal Completed Successfully!" : "⛔ Signal Stopped Out";
          let notificationDescription = `${signal.symbol} ${signal.type} ${finalStatus}`;
          
          if (isSuccessful) {
            if (newTargetsHit.length === signal.takeProfits.length) {
              notificationDescription += ` - Perfect execution: +${pnlPips} pips (all ${signal.takeProfits.length} targets)`;
            } else {
              notificationDescription += ` - Partial success: +${pnlPips} pips (${newTargetsHit.length}/${signal.takeProfits.length} targets)`;
            }
          } else {
            notificationDescription += ` - Loss: ${pnlPips} pips`;
          }
          
          toast({
            title: notificationTitle,
            description: notificationDescription,
            duration: 12000,
          });

          // Clear price alerts for this signal
          setLastPriceAlerts(prev => {
            const newState = { ...prev };
            delete newState[signal.id];
            return newState;
          });

        } catch (error) {
          console.error('❌ Error processing market-based signal completion:', error);
        }
      }
    }
  }, [toast, checkMarketStatus, checkSignificantMovement]);

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals only
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError || !activeSignals?.length) {
        return;
      }

      console.log(`🔍 MARKET-BASED MONITORING: ${activeSignals.length} active signals...`);

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const { data: marketData, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      if (priceError || !marketData?.length) {
        console.log('⚠️ No market data available for market-based signal monitoring');
        return;
      }

      // Create price lookup
      const currentPrices: Record<string, number> = {};
      marketData.forEach(data => {
        currentPrices[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Transform signals for monitoring
      const signalsToMonitor: SignalToMonitor[] = activeSignals.map(signal => ({
        id: signal.id,
        symbol: signal.symbol,
        type: (signal.type === 'BUY' || signal.type === 'SELL') ? signal.type as 'BUY' | 'SELL' : 'BUY',
        entryPrice: parseFloat(signal.price.toString()),
        stopLoss: parseFloat(signal.stop_loss.toString()),
        takeProfits: signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [],
        status: signal.status,
        createdAt: signal.created_at,
        targetsHit: signal.targets_hit || []
      }));

      // Check for outcomes using market conditions
      await checkSignalOutcomes(signalsToMonitor, currentPrices);

    } catch (error) {
      console.error('❌ Error in market-based signal monitoring:', error);
    }
  }, [checkSignalOutcomes]);

  useEffect(() => {
    // Initial monitoring check
    monitorActiveSignals();

    // Enhanced monitoring every 5 seconds for immediate market-based detection
    const monitorInterval = setInterval(monitorActiveSignals, 5000);

    // Subscribe to real-time price updates for immediate market-based checking
    const priceChannel = supabase
      .channel('market-outcome-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Check for market-based results immediately after price updates
          setTimeout(monitorActiveSignals, 500);
        }
      )
      .subscribe();

    // Subscribe to signal updates to refresh monitoring
    const signalChannel = supabase
      .channel('market-signal-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('📡 Market-based signal update detected:', payload);
          setTimeout(monitorActiveSignals, 1000);
        }
      )
      .subscribe();

    console.log('🔄 Market-based signal monitoring initialized with comprehensive notifications');

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
      supabase.removeChannel(signalChannel);
    };
  }, [monitorActiveSignals]);

  return {
    monitorActiveSignals
  };
};
