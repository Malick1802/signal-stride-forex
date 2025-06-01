import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TradingSignal {
  id: string;
  pair: string;
  type: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  confidence: number;
  timestamp: string;
  status: string;
  analysisText?: string;
  chartData: Array<{ time: number; price: number }>;
  targetsHit: number[];
}

// Maximum number of active signals
const MAX_ACTIVE_SIGNALS = 15;

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      // Fetch only ACTIVE centralized signals (limited to 15)
      const { data: centralizedSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(MAX_ACTIVE_SIGNALS); // Limited to 15 signals

      if (error) {
        console.error('❌ Error fetching active ultra-high-probability all-pairs signals:', error);
        setSignals([]);
        return;
      }

      if (!centralizedSignals || centralizedSignals.length === 0) {
        console.log('📭 No active ultra-high-probability all-pairs signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = processSignals(centralizedSignals);
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        console.log(`✅ Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} ultra-high-probability all-pairs signals (85%+ WIN RATE TARGET)`);
      }
      
    } catch (error) {
      console.error('❌ Error in fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const processSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} ultra-high-probability all-pairs signals (85%+ WIN RATE TARGET)`);

    const transformedSignals = activeSignals
      .map(signal => {
        try {
          if (!signal?.id || !signal?.symbol || !signal?.type) {
            console.warn('❌ Invalid signal data:', signal);
            return null;
          }

          // Use the stored signal price as the FIXED entry price
          const storedEntryPrice = parseFloat(signal.price?.toString() || '1.0');
          
          if (!storedEntryPrice || isNaN(storedEntryPrice) || storedEntryPrice <= 0) {
            console.warn(`❌ Invalid stored price for ${signal.symbol}: ${storedEntryPrice}`);
            return null;
          }

          // Use the FIXED stored chart data
          let chartData = [];
          if (signal.chart_data && Array.isArray(signal.chart_data)) {
            chartData = signal.chart_data.map(point => ({
              time: point.time || 0,
              price: parseFloat(point.price?.toString() || storedEntryPrice.toString())
            }));
            console.log(`📈 Using stored chart data for ${signal.symbol}: ${chartData.length} points`);
          } else {
            console.warn(`⚠️ No stored chart data for ${signal.symbol}, using entry price fallback`);
            const now = Date.now();
            chartData = [
              { time: now - 30000, price: storedEntryPrice },
              { time: now, price: storedEntryPrice }
            ];
          }

          // Use stored take profits
          let takeProfits = [];
          if (signal.take_profits && Array.isArray(signal.take_profits)) {
            takeProfits = signal.take_profits.map(tp => parseFloat(tp?.toString() || '0'));
          }

          // Get targets_hit array
          const targetsHit = signal.targets_hit || [];

          return {
            id: signal.id,
            pair: signal.symbol,
            type: signal.type || 'BUY',
            entryPrice: storedEntryPrice.toFixed(5),
            stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
            takeProfit1: takeProfits[0] ? takeProfits[0].toFixed(5) : '0.00000',
            takeProfit2: takeProfits[1] ? takeProfits[1].toFixed(5) : '0.00000',
            takeProfit3: takeProfits[2] ? takeProfits[2].toFixed(5) : '0.00000',
            confidence: Math.floor(signal.confidence || 92), // Higher confidence in ultra-conservative mode
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `ULTRA-HIGH-PROBABILITY ${signal.type || 'BUY'} signal for ${signal.symbol} (85%+ win rate target across all pairs)`,
            chartData: chartData,
            targetsHit: targetsHit
          };
        } catch (error) {
          console.error(`❌ Error transforming signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} ultra-high-probability all-pairs signals (85%+ WIN RATE TARGET)`);
    return transformedSignals;
  };

  const triggerIndividualSignalGeneration = useCallback(async () => {
    try {
      console.log(`🚀 Triggering ultra-high-probability all-pairs signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit (85%+ win rate target)...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Ultra-high-probability all-pairs signal generation failed:', signalError);
        toast({
          title: "Generation Failed",
          description: "Failed to detect new ultra-high-probability trading opportunities across all pairs",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Ultra-high-probability all-pairs signal generation completed with limit enforcement');
      
      // Refresh the signal list
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const opportunitiesAnalyzed = signalResult?.stats?.opportunitiesAnalyzed || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const signalLimit = signalResult?.stats?.signalLimit || MAX_ACTIVE_SIGNALS;
      const limitReached = signalResult?.stats?.limitReached || false;
      const generationRate = signalResult?.stats?.generationRate || '0%';
      const totalPairsAvailable = signalResult?.stats?.totalPairsAvailable || 'Unknown';
      
      toast({
        title: limitReached ? "Signal Limit Reached" : "Ultra-High-Probability All-Pairs Generation Complete",
        description: `${signalsGenerated} new ultra-high-probability signals generated across all pairs (${totalActiveSignals}/${signalLimit} total active) - 85%+ win rate target`,
      });
      
    } catch (error) {
      console.error('❌ Error in ultra-high-probability all-pairs signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to detect new ultra-high-probability trading opportunities across all pairs",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  const triggerRealTimeUpdates = useCallback(async () => {
    try {
      console.log('🚀 Triggering comprehensive real-time market update...');
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketDataError) {
        console.error('❌ Market data update failed:', marketDataError);
        toast({
          title: "Update Failed",
          description: "Failed to fetch baseline market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Market data updated');
      
      // Refresh signals to show updated current prices
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      toast({
        title: "Real-time Updates Active",
        description: "Market data refreshed, current prices will update live",
      });
      
    } catch (error) {
      console.error('❌ Error in real-time updates:', error);
      toast({
        title: "Update Error",
        description: "Failed to activate real-time updates",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Enhanced real-time subscriptions for ultra-high-probability all-pairs signals
    const signalsChannel = supabase
      .channel(`ultra-conservative-all-pairs-trading-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log(`📡 Real-time ultra-high-probability all-pairs signal change detected (85%+ WIN RATE TARGET):`, payload);
          // Immediate refresh for real-time signal updates
          setTimeout(fetchSignals, 200);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Ultra-high-probability all-pairs signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time ultra-high-probability all-pairs signal updates connected (85%+ WIN RATE TARGET)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Signal subscription failed, attempting to reconnect...');
          setTimeout(fetchSignals, 2000);
        }
      });

    // Subscribe to signal outcomes to refresh when signals expire
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
          console.log('📡 Signal outcome detected, refreshing active ultra-high-probability all-pairs signals:', payload);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe();

    // Automatic refresh every 2 minutes (backup for real-time)
    const updateInterval = setInterval(async () => {
      console.log(`🔄 Periodic ultra-high-probability all-pairs signal refresh (85%+ WIN RATE TARGET)...`);
      await fetchSignals();
    }, 2 * 60 * 1000);

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
    triggerAutomaticSignalGeneration: triggerIndividualSignalGeneration,
    triggerRealTimeUpdates
  };
};
