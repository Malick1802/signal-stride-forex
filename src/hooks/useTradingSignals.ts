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

// PRACTICAL: Balanced signal limit for consistent quality
const MAX_ACTIVE_SIGNALS = 12;

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      // Practical signal fetching with balanced quality focus
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
        console.error('❌ Error fetching practical quality signals:', error);
        setSignals([]);
        return;
      }

      if (!centralizedSignals || centralizedSignals.length === 0) {
        console.log('📭 No practical quality signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = processPracticalSignals(centralizedSignals);
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        console.log(`✅ Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} practical quality signals`);
      }
      
    } catch (error) {
      console.error('❌ Error in practical fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const processPracticalSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} practical quality signals`);

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
            
            console.log(`📈 Using practical chart data for ${signal.symbol}: ${chartData.length} points`);
          } else {
            console.warn(`⚠️ No chart data for ${signal.symbol}, using practical fallback`);
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
            confidence: Math.floor(safeParseFloat(signal.confidence, 75)), // Practical default confidence
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `PRACTICAL QUALITY ${signal.type || 'BUY'} signal for ${signal.symbol} (70%+ confidence with balanced risk management)`,
            chartData: chartData,
            targetsHit: targetsHit
          };
        } catch (error) {
          console.error(`❌ Error transforming practical signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} practical quality signals`);
    return transformedSignals;
  };

  const triggerPracticalSignalGeneration = useCallback(async () => {
    try {
      console.log(`🚀 Triggering PRACTICAL QUALITY signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Practical signal generation failed:', signalError);
        toast({
          title: "Practical Generation Failed",
          description: "Failed to detect new balanced quality trading opportunities",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Practical quality signal generation completed');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const signalLimit = signalResult?.stats?.signalLimit || MAX_ACTIVE_SIGNALS;
      const practicalQuality = signalResult?.stats?.practicalQuality || false;
      const balancedAnalysis = signalResult?.stats?.balancedAnalysis || false;
      
      toast({
        title: "🎯 Practical Quality Signals Generated",
        description: `${signalsGenerated} BALANCED signals generated (${totalActiveSignals}/${signalLimit} total)${practicalQuality ? ' - Practical quality' : ''}${balancedAnalysis ? ' - Balanced AI' : ''}`,
      });
      
    } catch (error) {
      console.error('❌ Error in practical signal generation:', error);
      toast({
        title: "Practical Generation Error",
        description: "Failed to detect new balanced quality trading opportunities",
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
      console.log('🚀 Triggering practical market data update...');
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketDataError) {
        console.error('❌ Practical market data update failed:', marketDataError);
        toast({
          title: "Practical Update Failed",
          description: "Failed to fetch practical market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Practical market data updated');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      toast({
        title: "🎯 Practical Real-time Updates Active",
        description: "Balanced market data refreshed, practical signals updating live",
      });
      
    } catch (error) {
      console.error('❌ Error in practical real-time updates:', error);
      toast({
        title: "Practical Update Error",
        description: "Failed to activate practical real-time updates",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Practical real-time subscriptions for balanced quality signals
    const signalsChannel = supabase
      .channel(`practical-quality-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log(`📡 Practical quality signal update detected:`, payload);
          setTimeout(fetchSignals, 300);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Practical quality signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Practical quality signal updates connected (70%+ confidence targeting)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Practical signal subscription failed, attempting to reconnect...');
          setTimeout(fetchSignals, 2000);
        }
      });

    // Subscribe to signal outcomes
    const outcomesChannel = supabase
      .channel(`practical-signal-outcomes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          console.log('📡 Practical signal outcome detected, refreshing balanced signals:', payload);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe();

    // Practical monitoring interval (balanced frequency)
    const updateInterval = setInterval(async () => {
      console.log(`🔄 Periodic practical quality signal refresh...`);
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
    triggerAutomaticSignalGeneration: triggerPracticalSignalGeneration,
    executeTimeBasedEliminationPlan,
    triggerRealTimeUpdates
  };
};
