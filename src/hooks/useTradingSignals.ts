import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { safeParseFloat, safeParseArray } from '@/utils/signalValidation';
import Logger from '@/utils/logger';

interface TradingSignal {
  id: string;
  pair: string;
  type: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  takeProfit4: string;
  takeProfit5: string;
  confidence: number;
  timestamp: string;
  status: string;
  analysisText?: string;
  chartData: Array<{ time: number; price: number }>;
  targetsHit: number[];
}

// UPDATED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [signalDistribution, setSignalDistribution] = useState({ buy: 0, sell: 0 });
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      Logger.debug('signals', `Fetching active signals (limit: ${MAX_ACTIVE_SIGNALS})...`);
      
      // First check if we have any signals at all
      const { data: allSignals, error: allError } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (allError) {
        Logger.error('signals', 'Error fetching all signals:', allError);
      } else {
        Logger.debug('signals', `Total signals in database: ${allSignals?.length || 0}`);
        if (allSignals && allSignals.length > 0) {
          Logger.debug('signals', `Sample signal:`, allSignals[0]);
        }
      }

      // Now fetch active centralized signals
      const { data: centralizedSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null)
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(MAX_ACTIVE_SIGNALS);

      if (error) {
        Logger.error('signals', 'Error fetching centralized signals:', error);
        throw error;
      }

      Logger.debug('signals', `Active centralized signals: ${centralizedSignals?.length || 0}`);

      if (!centralizedSignals || centralizedSignals.length === 0) {
        Logger.info('signals', 'No active centralized signals found - checking auto-generation eligibility');
        setSignals([]);
        setSignalDistribution({ buy: 0, sell: 0 });
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Smart auto-generation with cooldown to prevent loops
        if (!isInitialLoad) {
          const lastAutoGenKey = 'lastAutoGeneration';
          const lastAutoGen = localStorage.getItem(lastAutoGenKey);
          const now = Date.now();
          const cooldownPeriod = 5 * 60 * 1000; // 5 minutes cooldown
          
          if (!lastAutoGen || (now - parseInt(lastAutoGen)) > cooldownPeriod) {
            Logger.info('signals', 'Auto-generating signals due to empty signal set (cooldown satisfied)');
            localStorage.setItem(lastAutoGenKey, now.toString());
            
            setTimeout(async () => {
              try {
                await triggerSignalGeneration();
              } catch (error) {
                Logger.error('signals', 'Auto-generation failed:', error);
              }
            }, 2000);
          } else {
            const remainingCooldown = Math.ceil((cooldownPeriod - (now - parseInt(lastAutoGen))) / 1000 / 60);
            Logger.info('signals', `Auto-generation on cooldown for ${remainingCooldown} more minutes`);
          }
        }
        return;
      }

      const processedSignals = processSignals(centralizedSignals);
      
      const buyCount = processedSignals.filter(s => s.type === 'BUY').length;
      const sellCount = processedSignals.filter(s => s.type === 'SELL').length;
      setSignalDistribution({ buy: buyCount, sell: sellCount });
      
      Logger.info('signals', `Processed ${processedSignals.length}/${centralizedSignals.length} signals (BUY: ${buyCount}, SELL: ${sellCount})`);
      
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
    } catch (error) {
      Logger.error('signals', 'Error in fetchSignals:', error);
      if (isInitialLoad) {
        setSignals([]);
        setSignalDistribution({ buy: 0, sell: 0 });
      }
      throw error;
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad]);

  // Enhanced signal processing with comprehensive null filtering and validation
  const processSignals = useMemo(() => {
    return (activeSignals: any[]) => {
      Logger.debug('signals', `Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} signals`);

      // First pass: Filter out completely null/undefined signals
      const validRawSignals = activeSignals.filter((signal, index) => {
        // Enhanced null and type validation
        if (!signal) {
          Logger.debug('signals', `Signal ${index + 1} is null/undefined - filtering out`);
          return false;
        }
        
        if (typeof signal !== 'object') {
          Logger.debug('signals', `Signal ${index + 1} is not an object (${typeof signal}) - filtering out`);
          return false;
        }

        // Check for absolutely required fields with proper null/undefined checks
        if (!signal.id || typeof signal.id !== 'string') {
          Logger.debug('signals', `Signal ${index + 1} missing or invalid ID - id: ${signal.id} (type: ${typeof signal.id})`);
          return false;
        }

        if (!signal.symbol || typeof signal.symbol !== 'string') {
          Logger.debug('signals', `Signal ${index + 1} missing or invalid symbol - symbol: ${signal.symbol} (type: ${typeof signal.symbol})`);
          return false;
        }

        if (!signal.type || typeof signal.type !== 'string') {
          Logger.debug('signals', `Signal ${index + 1} missing or invalid type - type: ${signal.type} (type: ${typeof signal.type})`);
          return false;
        }

        // Validate signal type values
        if (signal.type !== 'BUY' && signal.type !== 'SELL') {
          Logger.debug('signals', `Signal ${index + 1} has invalid type value: ${signal.type}`);
          return false;
        }

        return true;
      });

      Logger.debug('signals', `First pass validation: ${validRawSignals.length}/${activeSignals.length} signals have basic required fields`);

      const transformedSignals = validRawSignals
        .map((signal, index) => {
          try {
            // Additional safety checks during transformation with explicit null handling
            if (!signal?.id || typeof signal.id !== 'string') {
              Logger.debug('signals', `Signal ${index + 1} has invalid ID during transformation: ${signal?.id}`);
              return null;
            }

            if (!signal?.symbol || typeof signal.symbol !== 'string') {
              Logger.debug('signals', `Signal ${index + 1} has invalid symbol during transformation: ${signal?.symbol}`);
              return null;
            }

            if (!signal?.type || typeof signal.type !== 'string') {
              Logger.debug('signals', `Signal ${index + 1} has invalid type during transformation: ${signal?.type}`);
              return null;
            }

            if (signal.type !== 'BUY' && signal.type !== 'SELL') {
              Logger.debug('signals', `Signal ${index + 1} has invalid type value during transformation: ${signal.type}`);
              return null;
            }

            const storedEntryPrice = safeParseFloat(signal.price, 0);
            
            if (storedEntryPrice <= 0) {
              Logger.debug('signals', `Invalid stored price for ${signal.symbol}: ${storedEntryPrice}`);
              return null;
            }

            // Enhanced chart data handling with better fallback
            let chartData = [];
            if (signal.chart_data && Array.isArray(signal.chart_data)) {
              chartData = signal.chart_data
                .filter(point => point && typeof point === 'object')
                .map(point => ({
                  time: point.time || 0,
                  price: safeParseFloat(point.price, storedEntryPrice)
                }))
                .filter(point => point.time > 0 && point.price > 0);
              
              Logger.debug('signals', `Using chart data for ${signal.symbol}: ${chartData.length} points`);
            } else {
              // Better fallback chart data
              const now = Date.now();
              const variation = storedEntryPrice * 0.0001;
              chartData = [
                { time: now - 60000, price: storedEntryPrice - variation },
                { time: now - 30000, price: storedEntryPrice },
                { time: now, price: storedEntryPrice + variation }
              ];
              Logger.debug('signals', `Using fallback chart data for ${signal.symbol}`);
            }

            // Enhanced take profits handling with null safety
            const takeProfits = safeParseArray(signal.take_profits);
            const targetsHit = safeParseArray(signal.targets_hit);

            const transformedSignal: TradingSignal = {
              id: signal.id,
              pair: signal.symbol,
              type: signal.type,
              entryPrice: storedEntryPrice.toFixed(5),
              stopLoss: safeParseFloat(signal.stop_loss, 0).toFixed(5),
              takeProfit1: takeProfits[0] ? takeProfits[0].toFixed(5) : '0.00000',
              takeProfit2: takeProfits[1] ? takeProfits[1].toFixed(5) : '0.00000',
              takeProfit3: takeProfits[2] ? takeProfits[2].toFixed(5) : '0.00000',
              takeProfit4: takeProfits[3] ? takeProfits[3].toFixed(5) : '0.00000',
              takeProfit5: takeProfits[4] ? takeProfits[4].toFixed(5) : '0.00000',
              confidence: Math.floor(safeParseFloat(signal.confidence, 70)),
              timestamp: signal.created_at || new Date().toISOString(),
              status: signal.status || 'active',
              analysisText: signal.analysis_text || `${signal.type} signal for ${signal.symbol} (${Math.floor(safeParseFloat(signal.confidence, 70))}% confidence)`,
              chartData: chartData,
              targetsHit: targetsHit
            };

            // Final validation of transformed signal with comprehensive checks
            if (!transformedSignal.id || typeof transformedSignal.id !== 'string') {
              Logger.error('signals', `Transformation failed for signal ${signal.id}: invalid ID after transformation`);
              return null;
            }

            if (!transformedSignal.pair || typeof transformedSignal.pair !== 'string') {
              Logger.error('signals', `Transformation failed for signal ${signal.id}: invalid pair after transformation`);
              return null;
            }

            if (!transformedSignal.type || typeof transformedSignal.type !== 'string') {
              Logger.error('signals', `Transformation failed for signal ${signal.id}: invalid type after transformation`);
              return null;
            }

            if (transformedSignal.type !== 'BUY' && transformedSignal.type !== 'SELL') {
              Logger.error('signals', `Invalid type after transformation for signal ${signal.id}: ${transformedSignal.type}`);
              return null;
            }

            Logger.debug('signals', `Successfully processed signal: ${transformedSignal.pair} ${transformedSignal.type} (${transformedSignal.confidence}%)`);
            return transformedSignal;
          } catch (error) {
            Logger.error('signals', `Error transforming signal ${index + 1} for ${signal?.symbol}:`, error);
            return null;
          }
        })
        .filter((signal): signal is TradingSignal => {
          if (!signal) {
            return false;
          }
          
          // Additional type safety checks for the filter predicate
          if (typeof signal !== 'object') {
            return false;
          }
          
          if (!signal.id || typeof signal.id !== 'string') {
            return false;
          }
          
          if (!signal.pair || typeof signal.pair !== 'string') {
            return false;
          }
          
          if (!signal.type || typeof signal.type !== 'string') {
            return false;
          }
          
          if (signal.type !== 'BUY' && signal.type !== 'SELL') {
            return false;
          }
          
          return true;
        });

      Logger.info('signals', `Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} signals after comprehensive validation`);
      return transformedSignals;
    };
  }, []);

  const triggerSignalGeneration = useCallback(async () => {
    try {
      Logger.info('signals', 'Triggering optimized signal generation...');
      
      // Enhanced debugging for generation attempts
      const { data: existingSignals, error: countError } = await supabase
        .from('trading_signals')
        .select('id, symbol, type, confidence, created_at')
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null);

      if (countError) {
        Logger.error('signals', 'Error checking existing signals:', countError);
      } else {
        Logger.info('signals', `Current active signals: ${existingSignals?.length || 0}/${MAX_ACTIVE_SIGNALS}`);
        if (existingSignals && existingSignals.length > 0) {
          Logger.debug('signals', 'Existing signals breakdown:', existingSignals.map(s => `${s.symbol} ${s.type} (${s.confidence}%)`));
        }
      }
      
      // Check market data availability before attempting generation
      const { data: marketCheck, error: marketError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price, last_update')
        .limit(5);
        
      if (marketError || !marketCheck || marketCheck.length === 0) {
        Logger.error('signals', 'No market data available for signal generation');
        toast({
          title: "Generation Skipped",
          description: "No market data available. Please check market data feed.",
          variant: "destructive"
        });
        return;
      }
      
      Logger.info('signals', `Market data available for ${marketCheck.length} pairs, proceeding with generation`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals', {
        body: { 
          force: true, // Force generation even if at limit
          debug: true,
          optimized: true,
          trigger: 'manual_optimized'
        }
      });
      
      if (signalError) {
        Logger.error('signals', 'Signal generation failed:', signalError);
        throw signalError;
      }
      
      Logger.info('signals', 'OPTIMIZED Signal generation result:', signalResult);
      
      // Enhanced result processing with detailed logging
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const signalsAttempted = signalResult?.stats?.totalGenerated || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const errors = signalResult?.stats?.errors || [];
      
      Logger.info('signals', `Generation summary: ${signalsGenerated} saved/${signalsAttempted} attempted, ${totalActiveSignals} total active`);
      
      if (errors.length > 0) {
        Logger.warn('signals', 'Generation errors:', errors);
      }
      
      // Wait for the signals to be processed and refresh
      await new Promise(resolve => setTimeout(resolve, 3000));
      await fetchSignals();
      
      // Enhanced user feedback
      if (signalsGenerated > 0) {
        toast({
          title: "✅ Optimized Generation Complete",
          description: `Generated ${signalsGenerated} quality signals. Total active: ${totalActiveSignals}`,
        });
      } else if (signalsAttempted > 0) {
        toast({
          title: "⚠️ Generation Complete - No Quality Signals",
          description: `Analyzed ${signalsAttempted} opportunities but none met quality standards. Market conditions may not favor new signals currently.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "ℹ️ Generation Complete - No Opportunities",
          description: "No signal opportunities found in current market conditions. This is normal during low-volatility periods.",
        });
      }
      
    } catch (error) {
      Logger.error('signals', 'Error in optimized signal generation:', error);
      toast({
        title: "Generation Failed",
        description: `Signal generation error: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  }, [fetchSignals, toast]);

  const executeTimeBasedEliminationPlan = useCallback(async () => {
    try {
      Logger.info('signals', 'Executing time-based expiration elimination plan...');
      
      const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke('cleanup-crons');
      
      if (cleanupError) {
        Logger.error('signals', 'Elimination plan error:', cleanupError);
        toast({
          title: "❌ Elimination Plan Failed",
          description: "Failed to eliminate time-based expiration. Check console for details.",
          variant: "destructive"
        });
        return false;
      }

      Logger.info('signals', 'Elimination plan result:', cleanupResult);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await fetchSignals();
      
      toast({
        title: "🎯 TIME-BASED EXPIRATION ELIMINATED",
        description: `${cleanupResult?.removedJobsByName?.length || 0} time-based jobs removed. Signals now expire ONLY on SL/TP hits + 72h safety net.`,
      });

      return true;
      
    } catch (error) {
      Logger.error('signals', 'Elimination plan error:', error);
      toast({
        title: "Elimination Plan Error",
        description: "Failed to execute time-based expiration elimination plan",
        variant: "destructive"
      });
      return false;
    }
  }, [fetchSignals, toast]);

  const triggerRealTimeUpdates = useCallback(async () => {
    try {
      Logger.info('signals', 'Triggering market data update...');
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketDataError) {
        Logger.error('signals', 'Market data update failed:', marketDataError);
        toast({
          title: "Update Failed",
          description: "Failed to fetch market data",
          variant: "destructive"
        });
        return;
      }
      
      Logger.info('signals', 'Market data updated');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      toast({
        title: "🎯 Real-time Updates Active",
        description: "Market data refreshed, signals updating live",
      });
      
    } catch (error) {
      Logger.error('signals', 'Error in real-time updates:', error);
      toast({
        title: "Update Error",
        description: "Failed to activate real-time updates",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Optimized real-time subscriptions
    const signalsChannel = supabase
      .channel(`pure-market-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          Logger.debug('signals', `Signal update detected:`, payload.eventType);
          setTimeout(fetchSignals, 300);
        }
      )
      .subscribe((status) => {
        Logger.debug('signals', `Signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          Logger.info('signals', `Signal updates connected (up to ${MAX_ACTIVE_SIGNALS} pure market signals)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          Logger.error('signals', 'Signal subscription failed, attempting to reconnect...');
          setTimeout(fetchSignals, 2000);
        }
      });

    // Subscribe to signal outcomes
    const outcomesChannel = supabase
      .channel(`signal-outcomes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          Logger.debug('signals', 'Signal outcome detected, refreshing signals:', payload.new);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe();

    // Optimized monitoring interval (2.5 minutes for balanced performance)
    const updateInterval = setInterval(async () => {
      Logger.debug('signals', 'Periodic signal refresh...');
      await fetchSignals();
    }, 2.5 * 60 * 1000);

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(outcomesChannel);
      clearInterval(updateInterval);
    };
  }, [fetchSignals]);

  return {
    signals,
    loading,
    lastUpdate,
    signalDistribution,
    fetchSignals,
    triggerAutomaticSignalGeneration: triggerSignalGeneration,
    executeTimeBasedEliminationPlan,
    triggerRealTimeUpdates
  };
};
