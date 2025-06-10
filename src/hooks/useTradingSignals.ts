import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { safeParseFloat, safeParseArray } from '@/utils/signalValidation';

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

// RELAXED: Practical signal limit for consistent quality with relaxed criteria
const MAX_ACTIVE_SIGNALS = 12;

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      // RELAXED signal fetching with practical quality focus
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
        console.error('❌ Error fetching relaxed practical signals:', error);
        setSignals([]);
        return;
      }

      if (!centralizedSignals || centralizedSignals.length === 0) {
        console.log('📭 No relaxed practical signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = processRelaxedSignals(centralizedSignals);
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        console.log(`✅ Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} relaxed practical signals`);
      }
      
    } catch (error) {
      console.error('❌ Error in relaxed fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const processRelaxedSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} relaxed practical signals`);

    const transformedSignals = activeSignals
      .map(signal => {
        try {
          if (!signal?.id || !signal?.symbol || !signal?.type) {
            console.warn('❌ Invalid signal data:', signal);
            return null;
          }

          const storedEntryPrice = safeParseFloat(signal.price, 1.0);
          
          if (storedEntryPrice <= 0) {
            console.warn(`❌ Invalid stored price for ${signal.symbol}: ${storedEntryPrice}`);
            return null;
          }

          // Enhanced chart data handling with null protection
          let chartData = [];
          if (signal.chart_data && Array.isArray(signal.chart_data)) {
            chartData = signal.chart_data
              .filter(point => point && typeof point === 'object')
              .map(point => ({
                time: point.time || 0,
                price: safeParseFloat(point.price, storedEntryPrice)
              }))
              .filter(point => point.time > 0 && point.price > 0);
            
            console.log(`📈 Using relaxed chart data for ${signal.symbol}: ${chartData.length} points`);
          } else {
            console.warn(`⚠️ No chart data for ${signal.symbol}, using relaxed fallback`);
            const now = Date.now();
            chartData = [
              { time: now - 30000, price: storedEntryPrice },
              { time: now, price: storedEntryPrice }
            ];
          }

          // Enhanced take profits handling with null protection
          const takeProfits = safeParseArray(signal.take_profits);
          const targetsHit = safeParseArray(signal.targets_hit);

          return {
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
            confidence: Math.floor(safeParseFloat(signal.confidence, 70)), // RELAXED default confidence
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `RELAXED PRACTICAL ${signal.type || 'BUY'} signal for ${signal.symbol} (65%+ confidence with relaxed risk management)`,
            chartData: chartData,
            targetsHit: targetsHit
          };
        } catch (error) {
          console.error(`❌ Error transforming relaxed signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} relaxed practical signals`);
    return transformedSignals;
  };

  const triggerRelaxedSignalGeneration = useCallback(async () => {
    try {
      console.log(`🚀 Triggering RELAXED PRACTICAL signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Relaxed signal generation failed:', signalError);
        toast({
          title: "Relaxed Generation Failed",
          description: "Failed to detect new relaxed quality trading opportunities",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Relaxed practical signal generation completed');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const signalLimit = signalResult?.stats?.signalLimit || MAX_ACTIVE_SIGNALS;
      const relaxedCriteria = signalResult?.stats?.relaxedCriteria || false;
      const practicalAnalysis = signalResult?.stats?.practicalAnalysis || false;
      
      toast({
        title: "🎯 RELAXED Practical Signals Generated",
        description: `${signalsGenerated} RELAXED signals generated (${totalActiveSignals}/${signalLimit} total)${relaxedCriteria ? ' - Relaxed criteria' : ''}${practicalAnalysis ? ' - Practical AI' : ''}`,
      });
      
    } catch (error) {
      console.error('❌ Error in relaxed signal generation:', error);
      toast({
        title: "Relaxed Generation Error",
        description: "Failed to detect new relaxed quality trading opportunities",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  const executeTimeBasedEliminationPlan = useCallback(async () => {
    try {
      console.log('🔥 PHASE 1: Executing TIME-BASED EXPIRATION ELIMINATION PLAN...');
      
      const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke('cleanup-crons');
      
      if (cleanupError) {
        console.error('❌ ELIMINATION PLAN ERROR:', cleanupError);
        toast({
          title: "❌ Elimination Plan Failed",
          description: "Failed to eliminate time-based expiration. Check console for details.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ ELIMINATION PLAN RESULT:', cleanupResult);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await fetchSignals();
      
      toast({
        title: "🎯 TIME-BASED EXPIRATION ELIMINATED",
        description: `${cleanupResult?.removedJobsByName?.length || 0} time-based jobs removed. Signals now expire ONLY on SL/TP hits + 72h safety net.`,
      });

      console.log('🎯 PHASE 2: PURE OUTCOME-BASED MONITORING NOW ACTIVE');
      console.log('✅ Signals will ONLY expire when:');
      console.log('   - Stop Loss is hit by market price');
      console.log('   - Take Profit targets are hit by market price');
      console.log('   - Emergency 72-hour abandonment timeout (safety only)');
      console.log('❌ NO MORE 4-hour automatic expiration');
      
      return true;
      
    } catch (error) {
      console.error('❌ ELIMINATION PLAN ERROR:', error);
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
      console.log('🚀 Triggering relaxed market data update...');
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketDataError) {
        console.error('❌ Relaxed market data update failed:', marketDataError);
        toast({
          title: "Relaxed Update Failed",
          description: "Failed to fetch relaxed market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Relaxed market data updated');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      toast({
        title: "🎯 RELAXED Real-time Updates Active",
        description: "Relaxed market data refreshed, practical signals updating live",
      });
      
    } catch (error) {
      console.error('❌ Error in relaxed real-time updates:', error);
      toast({
        title: "Relaxed Update Error",
        description: "Failed to activate relaxed real-time updates",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // RELAXED real-time subscriptions for practical quality signals
    const signalsChannel = supabase
      .channel(`relaxed-practical-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log(`📡 Relaxed practical signal update detected:`, payload);
          setTimeout(fetchSignals, 300);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Relaxed practical signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Relaxed practical signal updates connected (65%+ confidence targeting)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Relaxed signal subscription failed, attempting to reconnect...');
          setTimeout(fetchSignals, 2000);
        }
      });

    // Subscribe to signal outcomes
    const outcomesChannel = supabase
      .channel(`relaxed-signal-outcomes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          console.log('📡 Relaxed signal outcome detected, refreshing practical signals:', payload);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe();

    // RELAXED monitoring interval (balanced frequency)
    const updateInterval = setInterval(async () => {
      console.log(`🔄 Periodic relaxed practical signal refresh...`);
      await fetchSignals();
    }, 2.5 * 60 * 1000); // Every 2.5 minutes for balanced monitoring

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
    triggerAutomaticSignalGeneration: triggerRelaxedSignalGeneration,
    executeTimeBasedEliminationPlan,
    triggerRealTimeUpdates
  };
};
