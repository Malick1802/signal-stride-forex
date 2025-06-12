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

// UPDATED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      console.log(`🔍 Fetching active signals (limit: ${MAX_ACTIVE_SIGNALS})...`);
      
      // UPDATED signal fetching with increased practical quality focus
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
        console.error('❌ Error fetching practical signals:', error);
        setSignals([]);
        return;
      }

      console.log(`📊 RAW SIGNALS FETCHED: ${centralizedSignals?.length || 0} signals from database`);

      if (!centralizedSignals || centralizedSignals.length === 0) {
        console.log('📭 No practical signals found in database');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      // Log raw signal data for debugging
      centralizedSignals.forEach((signal, index) => {
        console.log(`📊 Raw Signal ${index + 1}:`, {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type,
          status: signal.status,
          confidence: signal.confidence,
          created_at: signal.created_at,
          hasRequiredFields: !!(signal.id && signal.symbol && signal.type && signal.price)
        });
      });

      const processedSignals = processSignals(centralizedSignals);
      
      console.log(`📊 PROCESSED SIGNALS: ${processedSignals.length}/${centralizedSignals.length} signals passed processing`);
      
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        console.log(`✅ Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} practical signals`);
      } else {
        console.warn(`⚠️ No signals passed processing validation out of ${centralizedSignals.length} raw signals`);
      }
      
    } catch (error) {
      console.error('❌ Error in fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const processSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} practical signals`);

    const transformedSignals = activeSignals
      .map((signal, index) => {
        try {
          console.log(`🔄 Processing signal ${index + 1}/${activeSignals.length}:`, signal?.id || 'NO_ID');
          
          if (!signal) {
            console.warn(`❌ Signal ${index + 1} is null/undefined`);
            return null;
          }

          if (!signal?.id || !signal?.symbol || !signal?.type) {
            console.warn(`❌ Signal ${index + 1} missing required fields:`, {
              id: signal?.id,
              symbol: signal?.symbol,
              type: signal?.type,
              hasId: !!signal?.id,
              hasSymbol: !!signal?.symbol,
              hasType: !!signal?.type
            });
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
            confidence: Math.floor(safeParseFloat(signal.confidence, 70)), // RELAXED default confidence
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `RELAXED PRACTICAL ${signal.type || 'BUY'} signal for ${signal.symbol} (65%+ confidence with relaxed risk management)`,
            chartData: chartData,
            targetsHit: targetsHit
          };

          console.log(`✅ Successfully processed signal ${index + 1}: ${transformedSignal.pair} ${transformedSignal.type} (${transformedSignal.confidence}%)`);
          return transformedSignal;
        } catch (error) {
          console.error(`❌ Error transforming practical signal ${index + 1} for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} practical signals`);
    return transformedSignals;
  };

  const triggerSignalGeneration = useCallback(async () => {
    try {
      console.log(`🚀 Triggering PRACTICAL signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Signal generation failed:', signalError);
        toast({
          title: "Generation Failed",
          description: "Failed to detect new quality trading opportunities",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Practical signal generation completed');
      
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
      console.error('❌ Error in signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to detect new quality trading opportunities",
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
    
    // Updated real-time subscriptions for practical quality signals
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
          console.log(`📡 Practical signal update detected:`, payload);
          setTimeout(fetchSignals, 300);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Practical signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Practical signal updates connected (up to ${MAX_ACTIVE_SIGNALS} signals)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Signal subscription failed, attempting to reconnect...');
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
    triggerAutomaticSignalGeneration: triggerSignalGeneration,
    executeTimeBasedEliminationPlan,
    triggerRealTimeUpdates
  };
};
