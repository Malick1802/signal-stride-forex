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
  analysisText: string; // Made required to match the type predicate
  chartData: Array<{ time: number; price: number }>;
  targetsHit: number[];
}

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
      
      Logger.info('signals', `Phase 4: Fetching active signals with enhanced validation...`);
      
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
        Logger.error('signals', 'Phase 4: Error fetching signals:', error);
        if (isInitialLoad) {
          setSignals([]);
          setSignalDistribution({ buy: 0, sell: 0 });
        }
        return;
      }

      Logger.info('signals', `Phase 4: Retrieved ${centralizedSignals?.length || 0} signals from database`);

      if (!centralizedSignals || centralizedSignals.length === 0) {
        Logger.info('signals', 'Phase 4: No active signals found in database');
        setSignals([]);
        setSignalDistribution({ buy: 0, sell: 0 });
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      // Enhanced signal processing with validation
      const processedSignals = processSignals(centralizedSignals);
      
      const buyCount = processedSignals.filter(s => s.type === 'BUY').length;
      const sellCount = processedSignals.filter(s => s.type === 'SELL').length;
      setSignalDistribution({ buy: buyCount, sell: sellCount });
      
      Logger.info('signals', `Phase 4: Successfully processed ${processedSignals.length}/${centralizedSignals.length} signals`);
      Logger.info('signals', `Phase 4: Signal distribution - BUY: ${buyCount}, SELL: ${sellCount}`);
      
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
    } catch (error) {
      Logger.error('signals', 'Phase 4: Critical error in fetchSignals:', error);
      if (isInitialLoad) {
        setSignals([]);
        setSignalDistribution({ buy: 0, sell: 0 });
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad]);

  const processSignals = useMemo(() => {
    return (activeSignals: any[]) => {
      Logger.info('signals', `Phase 4: Processing ${activeSignals.length} signals with enhanced validation`);

      const transformedSignals = activeSignals
        .map((signal, index) => {
          try {
            // Enhanced validation
            if (!signal) {
              Logger.warn('signals', `Phase 4: Signal ${index + 1} is null/undefined`);
              return null;
            }

            if (!signal?.id || !signal?.symbol || !signal?.type) {
              Logger.warn('signals', `Phase 4: Signal ${index + 1} missing required fields`);
              return null;
            }

            // Enhanced price validation
            const storedEntryPrice = safeParseFloat(signal.price, 0);
            if (storedEntryPrice <= 0) {
              Logger.warn('signals', `Phase 4: Invalid price for ${signal.symbol}: ${signal.price}`);
              return null;
            }

            // Enhanced chart data handling
            let chartData = [];
            try {
              if (signal.chart_data && Array.isArray(signal.chart_data)) {
                chartData = signal.chart_data
                  .filter(point => point && typeof point === 'object' && point.time && point.price)
                  .map(point => ({
                    time: point.time || 0,
                    price: safeParseFloat(point.price, storedEntryPrice)
                  }))
                  .filter(point => point.time > 0 && point.price > 0);
                
                Logger.debug('signals', `Phase 4: Chart data for ${signal.symbol}: ${chartData.length} valid points`);
              }
            } catch (chartError) {
              Logger.warn('signals', `Phase 4: Chart data processing error for ${signal.symbol}:`, chartError);
              chartData = [];
            }

            // Enhanced fallback chart data
            if (chartData.length === 0) {
              const now = Date.now();
              const variation = storedEntryPrice * 0.0002; // Slightly more realistic variation
              chartData = [
                { time: now - 180000, price: storedEntryPrice - variation },
                { time: now - 120000, price: storedEntryPrice - (variation * 0.5) },
                { time: now - 60000, price: storedEntryPrice },
                { time: now - 30000, price: storedEntryPrice + (variation * 0.3) },
                { time: now, price: storedEntryPrice + variation }
              ];
              Logger.debug('signals', `Phase 4: Generated enhanced fallback chart data for ${signal.symbol}`);
            }

            // Enhanced take profits handling
            const takeProfits = safeParseArray(signal.take_profits);
            const targetsHit = safeParseArray(signal.targets_hit);

            const transformedSignal: TradingSignal = {
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
              analysisText: signal.analysis_text || `Enhanced ${signal.type || 'BUY'} signal for ${signal.symbol} with ${Math.floor(safeParseFloat(signal.confidence, 70))}% confidence`,
              chartData: chartData,
              targetsHit: targetsHit
            };

            Logger.debug('signals', `Phase 4: Successfully processed: ${transformedSignal.pair} ${transformedSignal.type} (${transformedSignal.confidence}%)`);
            return transformedSignal;
          } catch (error) {
            Logger.error('signals', `Phase 4: Error transforming signal ${index + 1} for ${signal?.symbol}:`, error);
            return null;
          }
        })
        .filter((signal): signal is TradingSignal => {
          if (!signal) return false;
          
          // Final validation to ensure all required properties exist
          const isValid = !!(signal.id && 
                           signal.pair && 
                           signal.type && 
                           signal.entryPrice && 
                           signal.stopLoss && 
                           signal.takeProfit1 && 
                           signal.takeProfit2 && 
                           signal.takeProfit3 && 
                           signal.confidence && 
                           signal.timestamp && 
                           signal.analysisText);
          
          if (!isValid) {
            Logger.warn('signals', `Phase 4: Signal failed final validation: ${signal.pair}`);
          }
          
          return isValid;
        });

      Logger.info('signals', `Phase 4: Final processing result: ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} validated signals`);
      return transformedSignals;
    };
  }, []);

  const triggerSignalGeneration = useCallback(async () => {
    try {
      Logger.info('signals', `Phase 3: Triggering enhanced signal generation...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        Logger.error('signals', 'Phase 3: Signal generation failed:', signalError);
        toast({
          title: "Generation Failed",
          description: "Failed to generate new trading signals. Please check system status.",
          variant: "destructive"
        });
        return;
      }
      
      Logger.info('signals', 'Phase 3: Signal generation completed:', signalResult);
      
      // Wait for database to update then refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const distribution = signalResult?.stats?.signalDistribution || {};
      
      if (signalsGenerated > 0) {
        toast({
          title: "🎯 High-Quality Signals Generated",
          description: `${signalsGenerated} new signals generated (BUY: ${distribution.newBuySignals || 0}, SELL: ${distribution.newSellSignals || 0}) - ${totalActiveSignals}/${MAX_ACTIVE_SIGNALS} total`,
        });
      } else {
        toast({
          title: "📊 Analysis Complete",
          description: "Market analysis completed. No new high-quality opportunities detected (75%+ confidence threshold).",
        });
      }
      
    } catch (error) {
      Logger.error('signals', 'Phase 3: Error in signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate signals due to technical error",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  const executeTimeBasedEliminationPlan = useCallback(async () => {
    try {
      Logger.info('signals', 'Executing time-based expiration elimination...');
      
      const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke('cleanup-crons');
      
      if (cleanupError) {
        Logger.error('signals', 'Elimination plan error:', cleanupError);
        toast({
          title: "❌ Elimination Failed",
          description: "Failed to eliminate time-based expiration. Check logs for details.",
          variant: "destructive"
        });
        return false;
      }

      Logger.info('signals', 'Elimination plan completed:', cleanupResult);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await fetchSignals();
      
      toast({
        title: "🎯 TIME-BASED EXPIRATION ELIMINATED",
        description: `Time-based jobs removed. Signals now expire ONLY on SL/TP hits + 72h safety net.`,
      });

      return true;
      
    } catch (error) {
      Logger.error('signals', 'Elimination plan error:', error);
      toast({
        title: "Elimination Error",
        description: "Failed to execute time-based expiration elimination",
        variant: "destructive"
      });
      return false;
    }
  }, [fetchSignals, toast]);

  const triggerRealTimeUpdates = useCallback(async () => {
    try {
      Logger.info('signals', 'Triggering enhanced market data update...');
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('centralized-market-stream');
      
      if (marketDataError) {
        Logger.error('signals', 'Market data update failed:', marketDataError);
        toast({
          title: "Update Failed",
          description: "Failed to fetch fresh market data",
          variant: "destructive"
        });
        return;
      }
      
      Logger.info('signals', 'Market data updated:', marketResult);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      const pairsUpdated = marketResult?.pairsUpdated || 0;
      
      toast({
        title: "🎯 Market Data Updated",
        description: `Fresh data fetched for ${pairsUpdated} currency pairs using Tiingo institutional feeds`,
      });
      
    } catch (error) {
      Logger.error('signals', 'Error in market data update:', error);
      toast({
        title: "Update Error",
        description: "Failed to update market data",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Enhanced real-time subscriptions
    const signalsChannel = supabase
      .channel(`enhanced-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          Logger.info('signals', `Phase 4: Real-time signal update detected:`, payload.eventType);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe((status) => {
        Logger.info('signals', `Phase 4: Enhanced signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          Logger.info('signals', `Phase 4: Enhanced signal monitoring active (up to ${MAX_ACTIVE_SIGNALS} signals)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          Logger.error('signals', 'Phase 4: Signal subscription failed, reconnecting...');
          setTimeout(fetchSignals, 3000);
        }
      });

    // Enhanced monitoring interval - less frequent during market closure
    const updateInterval = setInterval(async () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcDay = now.getUTCDay();
      
      const isMarketClosed = (utcDay === 5 && utcHour >= 22) || utcDay === 6 || (utcDay === 0 && utcHour < 22);
      
      if (!isMarketClosed) {
        Logger.debug('signals', 'Phase 4: Periodic enhanced signal refresh...');
        await fetchSignals();
      } else {
        Logger.debug('signals', 'Phase 4: Market closed - skipping periodic refresh');
      }
    }, 5 * 60 * 1000); // 5 minutes, but respects market hours

    return () => {
      supabase.removeChannel(signalsChannel);
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
