
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
  takeProfit4: string;
  takeProfit5: string;
  confidence: number;
  timestamp: string;
  status: string;
  analysisText?: string;
  chartData: Array<{ time: number; price: number }>;
  targetsHit: number[];
}

// ENHANCED: Reduced signal limit for quality focus (matching backend)
const MAX_ACTIVE_SIGNALS = 12;

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      // Enhanced signal fetching with quality focus
      const { data: centralizedSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null)
        .order('confidence', { ascending: false }) // Order by quality (confidence)
        .order('created_at', { ascending: false })
        .limit(MAX_ACTIVE_SIGNALS);

      if (error) {
        console.error('❌ Error fetching enhanced quality signals:', error);
        setSignals([]);
        return;
      }

      if (!centralizedSignals || centralizedSignals.length === 0) {
        console.log('📭 No enhanced quality signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = processEnhancedSignals(centralizedSignals);
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        console.log(`✅ Loaded ${processedSignals.length}/${MAX_ACTIVE_SIGNALS} enhanced quality signals`);
      }
      
    } catch (error) {
      console.error('❌ Error in enhanced fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const processEnhancedSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length}/${MAX_ACTIVE_SIGNALS} enhanced quality signals`);

    const transformedSignals = activeSignals
      .map(signal => {
        try {
          if (!signal?.id || !signal?.symbol || !signal?.type) {
            console.warn('❌ Invalid signal data:', signal);
            return null;
          }

          const storedEntryPrice = parseFloat(signal.price?.toString() || '1.0');
          
          if (!storedEntryPrice || isNaN(storedEntryPrice) || storedEntryPrice <= 0) {
            console.warn(`❌ Invalid stored price for ${signal.symbol}: ${storedEntryPrice}`);
            return null;
          }

          // Enhanced chart data handling
          let chartData = [];
          if (signal.chart_data && Array.isArray(signal.chart_data)) {
            chartData = signal.chart_data.map(point => ({
              time: point.time || 0,
              price: parseFloat(point.price?.toString() || storedEntryPrice.toString())
            }));
            console.log(`📈 Using enhanced chart data for ${signal.symbol}: ${chartData.length} points`);
          } else {
            console.warn(`⚠️ No chart data for ${signal.symbol}, using enhanced fallback`);
            const now = Date.now();
            chartData = [
              { time: now - 30000, price: storedEntryPrice },
              { time: now, price: storedEntryPrice }
            ];
          }

          let takeProfits = [];
          if (signal.take_profits && Array.isArray(signal.take_profits)) {
            takeProfits = signal.take_profits.map(tp => parseFloat(tp?.toString() || '0'));
          }

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
            takeProfit4: takeProfits[3] ? takeProfits[3].toFixed(5) : '0.00000',
            takeProfit5: takeProfits[4] ? takeProfits[4].toFixed(5) : '0.00000',
            confidence: Math.floor(signal.confidence || 85), // Enhanced default confidence
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `ENHANCED QUALITY ${signal.type || 'BUY'} signal for ${signal.symbol} (85%+ confidence with improved risk management)`,
            chartData: chartData,
            targetsHit: targetsHit
          };
        } catch (error) {
          console.error(`❌ Error transforming enhanced signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length}/${MAX_ACTIVE_SIGNALS} enhanced quality signals`);
    return transformedSignals;
  };

  const triggerEnhancedSignalGeneration = useCallback(async () => {
    try {
      console.log(`🚀 Triggering ENHANCED QUALITY signal generation with ${MAX_ACTIVE_SIGNALS}-signal limit...`);
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Enhanced signal generation failed:', signalError);
        toast({
          title: "Enhanced Generation Failed",
          description: "Failed to detect new high-quality trading opportunities",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Enhanced quality signal generation completed');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchSignals();
      
      const signalsGenerated = signalResult?.stats?.signalsGenerated || 0;
      const totalActiveSignals = signalResult?.stats?.totalActiveSignals || 0;
      const signalLimit = signalResult?.stats?.signalLimit || MAX_ACTIVE_SIGNALS;
      const qualityFocus = signalResult?.stats?.qualityFocus || false;
      const enhancedAnalysis = signalResult?.stats?.enhancedAnalysis || false;
      
      toast({
        title: "🎯 Enhanced Quality Signals Generated",
        description: `${signalsGenerated} PREMIUM signals generated (${totalActiveSignals}/${signalLimit} total)${qualityFocus ? ' - Quality-focused' : ''}${enhancedAnalysis ? ' - Advanced AI' : ''}`,
      });
      
    } catch (error) {
      console.error('❌ Error in enhanced signal generation:', error);
      toast({
        title: "Enhanced Generation Error",
        description: "Failed to detect new premium trading opportunities",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  const executeTimeBasedEliminationPlan = useCallback(async () => {
    try {
      console.log('🔥 PHASE 1: Executing TIME-BASED EXPIRATION ELIMINATION PLAN...');
      
      // Execute the cleanup-crons function to remove time-based expiration jobs
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
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh signals to verify pure outcome-based system
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
      console.log('🚀 Triggering enhanced market data update...');
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketDataError) {
        console.error('❌ Enhanced market data update failed:', marketDataError);
        toast({
          title: "Enhanced Update Failed",
          description: "Failed to fetch enhanced market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Enhanced market data updated');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchSignals();
      
      toast({
        title: "🎯 Enhanced Real-time Updates Active",
        description: "Premium market data refreshed, quality signals updating live",
      });
      
    } catch (error) {
      console.error('❌ Error in enhanced real-time updates:', error);
      toast({
        title: "Enhanced Update Error",
        description: "Failed to activate enhanced real-time updates",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Enhanced real-time subscriptions for quality signals
    const signalsChannel = supabase
      .channel(`enhanced-quality-signals-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log(`📡 Enhanced quality signal update detected:`, payload);
          setTimeout(fetchSignals, 300);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Enhanced quality signals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Enhanced quality signal updates connected (85%+ confidence targeting)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Enhanced signal subscription failed, attempting to reconnect...');
          setTimeout(fetchSignals, 2000);
        }
      });

    // Subscribe to signal outcomes
    const outcomesChannel = supabase
      .channel(`enhanced-signal-outcomes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          console.log('📡 Enhanced signal outcome detected, refreshing quality signals:', payload);
          setTimeout(fetchSignals, 500);
        }
      )
      .subscribe();

    // Enhanced monitoring interval (reduced frequency for quality signals)
    const updateInterval = setInterval(async () => {
      console.log(`🔄 Periodic enhanced quality signal refresh...`);
      await fetchSignals();
    }, 3 * 60 * 1000); // Every 3 minutes for quality focus

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
    triggerAutomaticSignalGeneration: triggerEnhancedSignalGeneration,
    executeTimeBasedEliminationPlan, // NEW: Function to eliminate time-based expiration
    triggerRealTimeUpdates
  };
};
