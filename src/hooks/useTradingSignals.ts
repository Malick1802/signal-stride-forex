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
        console.error('❌ Error fetching active centralized signals:', error);
        setSignals([]);
        return;
      }

      if (!centralizedSignals || centralizedSignals.length === 0) {
        console.log('📭 No active centralized signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = processSignals(centralizedSignals);
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        console.log(`✅ Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} high-confidence centralized signals (SIGNAL LIMIT: ${MAX_ACTIVE_SIGNALS})`);
      }
      
    } catch (error) {
      console.error('❌ Error in fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const processSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} high-confidence centralized signals (SIGNAL LIMIT ENFORCED)`);

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
            confidence: Math.floor(signal.confidence || 85), // Higher confidence in professional mode
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `HIGH-CONFIDENCE Professional ${signal.type || 'BUY'} signal for ${signal.symbol}`,
            chartData: chartData,
            targetsHit: targetsHit
          };
        } catch (error) {
          console.error(`❌ Error transforming signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} high-confidence centralized signals (SIGNAL LIMIT: ${MAX_ACTIVE_SIGNALS})`);
    return transformedSignals;
  };

  const triggerIndividualSignalGeneration = useCallback(async () => {
    try {
      console.log(`🚀 Triggering high-confidence signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Signal generation failed:', signalError);
        toast({
          title: "Generation Failed",
          description: "Failed to detect new high-confidence trading opportunities",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ High-confidence signal generation completed with limit enforcement');
      
      // Refresh the signal list
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const opportunitiesAnalyzed = signalResult?.stats?.opportunitiesAnalyzed || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const signalLimit = signalResult?.stats?.signalLimit || MAX_ACTIVE_SIGNALS;
      const limitReached = signalResult?.stats?.limitReached || false;
      const generationRate = signalResult?.stats?.generationRate || '0%';
      
      toast({
        title: limitReached ? "Signal Limit Reached" : "High-Confidence Generation Complete",
        description: `${signalsGenerated} new high-confidence signals generated (${totalActiveSignals}/${signalLimit} total active)`,
      });
      
    } catch (error) {
      console.error('❌ Error in signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to detect new high-confidence trading opportunities",
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
    
    // Enhanced real-time subscriptions for centralized signals
    const signalsChannel = supabase
      .channel(`centralized-trading-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log(`📡 Real-time centralized signal change detected (HIGH-CONFIDENCE LIMIT: ${MAX_ACTIVE_SIGNALS}):`, payload);
          // Immediate refresh for real-time signal updates
          setTimeout(fetchSignals, 200);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Centralized signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time signal updates connected (HIGH-CONFIDENCE LIMIT: ${MAX_ACTIVE_SIGNALS})`);
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
          console.log('📡 Signal outcome detected, refreshing active signals:', payload);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe();

    // Automatic refresh every 2 minutes (backup for real-time)
    const updateInterval = setInterval(async () => {
      console.log(`🔄 Periodic high-confidence signal refresh (SIGNAL LIMIT: ${MAX_ACTIVE_SIGNALS})...`);
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
    triggerRealTimeUpdates: useCallback(async () => {
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
    }, [fetchSignals, toast])
  };
};
