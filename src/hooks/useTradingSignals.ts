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
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      // Only show loading for initial load to prevent race conditions
      if (isInitialLoad) {
        setLoading(true);
      }
      
      Logger.debug('signals', `Fetching active signals (limit: ${MAX_ACTIVE_SIGNALS})...`);
      
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
        Logger.error('signals', 'Error fetching signals:', error);
        if (isInitialLoad) {
          setSignals([]);
        }
        return;
      }

      Logger.debug('signals', `RAW SIGNALS FETCHED: ${centralizedSignals?.length || 0} signals from database`);

      if (!centralizedSignals || centralizedSignals.length === 0) {
        Logger.debug('signals', 'No signals found in database');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = processSignals(centralizedSignals);
      
      Logger.info('signals', `PROCESSED SIGNALS: ${processedSignals.length}/${centralizedSignals.length} signals passed processing`);
      
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        Logger.info('signals', `Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} practical signals`);
      }
      
    } catch (error) {
      Logger.error('signals', 'Error in fetchSignals:', error);
      if (isInitialLoad) {
        setSignals([]);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad]);

  // Memoized signal processing to prevent unnecessary recalculations
  const processSignals = useMemo(() => {
    return (activeSignals: any[]) => {
      Logger.debug('signals', `Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} signals`);

      const transformedSignals = activeSignals
        .map((signal, index) => {
          try {
            if (!signal) {
              Logger.debug('signals', `Signal ${index + 1} is null/undefined`);
              return null;
            }

            if (!signal?.id || !signal?.symbol || !signal?.type) {
              Logger.debug('signals', `Signal ${index + 1} missing required fields`);
              return null;
            }

            const storedEntryPrice = safeParseFloat(signal.price, 1.0);
            
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

            // Enhanced take profits handling
            const takeProfits = safeParseArray(signal.take_profits);
            const targetsHit = safeParseArray(signal.targets_hit);

            const transformedSignal = {
              id: signal.id,
              pair: signal.symbol,
              type: signal.type || 'BUY',
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
              analysisText: signal.analysis_text || `${signal.type || 'BUY'} signal for ${signal.symbol} (${Math.floor(safeParseFloat(signal.confidence, 70))}% confidence)`,
              chartData: chartData,
              targetsHit: targetsHit
            };

            Logger.debug('signals', `Successfully processed signal: ${transformedSignal.pair} ${transformedSignal.type} (${transformedSignal.confidence}%)`);
            return transformedSignal;
          } catch (error) {
            Logger.error('signals', `Error transforming signal ${index + 1} for ${signal?.symbol}:`, error);
            return null;
          }
        })
        .filter(Boolean) as TradingSignal[];

      Logger.info('signals', `Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} signals`);
      return transformedSignals;
    };
  }, []);

  const triggerSignalGeneration = useCallback(async () => {
    try {
      Logger.info('signals', `Triggering signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        Logger.error('signals', 'Signal generation failed:', signalError);
        toast({
          title: "Generation Failed",
          description: "Failed to detect new quality trading opportunities",
          variant: "destructive"
        });
        return;
      }
      
      Logger.info('signals', 'Signal generation completed');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const signalLimit = signalResult?.stats?.signalLimit || MAX_ACTIVE_SIGNALS;
      
      toast({
        title: "🎯 Practical Signals Generated",
        description: `${signalsGenerated} signals generated (${totalActiveSignals}/${signalLimit} total)`,
      });
      
    } catch (error) {
      Logger.error('signals', 'Error in signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to detect new quality trading opportunities",
        variant: "destructive"
      });
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
      .channel(`practical-signals-${Date.now()}`)
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
          Logger.info('signals', `Signal updates connected (up to ${MAX_ACTIVE_SIGNALS} signals)`);
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
    fetchSignals,
    triggerAutomaticSignalGeneration: triggerSignalGeneration,
    executeTimeBasedEliminationPlan,
    triggerRealTimeUpdates
  };
};
