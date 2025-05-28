import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useConnectionManager } from './useConnectionManager';

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

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();
  const { queueRequest } = useConnectionManager();

  const fetchSignals = useCallback(async () => {
    await queueRequest(async () => {
      try {
        console.log('🔄 Fetching signals (throttled)...');
        
        // Single optimized query
        const { data: centralizedSignals, error } = await supabase
          .from('trading_signals')
          .select('*')
          .eq('status', 'active')
          .eq('is_centralized', true)
          .is('user_id', null)
          .order('created_at', { ascending: false })
          .limit(30); // Reduced limit

        if (error) {
          console.error('❌ Error fetching signals:', error);
          setSignals([]);
          return;
        }

        const processedSignals = processSignals(centralizedSignals || []);
        setSignals(processedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        console.log(`✅ Loaded ${processedSignals.length} signals (throttled)`);
        
      } catch (error) {
        console.error('❌ Error in fetchSignals:', error);
        setSignals([]);
      } finally {
        setLoading(false);
      }
    });
  }, [queueRequest]);

  const processSignals = (activeSignals: any[]) => {
    console.log(`📊 Processing ${activeSignals.length} active centralized signals (ULTRA-AGGRESSIVE MODE)`);

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
            confidence: Math.floor(signal.confidence || 60), // Lower confidence in test mode
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `ULTRA-AGGRESSIVE AI ${signal.type || 'BUY'} signal for ${signal.symbol}`,
            chartData: chartData,
            targetsHit: targetsHit
          };
        } catch (error) {
          console.error(`❌ Error transforming signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length} active centralized signals (ULTRA-AGGRESSIVE TEST MODE)`);
    return transformedSignals;
  };

  const triggerIndividualSignalGeneration = useCallback(async () => {
    await queueRequest(async () => {
      try {
        console.log('🚀 Triggering signal generation (throttled)...');
        
        const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
        
        if (signalError) {
          console.error('❌ Signal generation failed:', signalError);
          toast({
            title: "Generation Failed",
            description: "Failed to detect new trading opportunities",
            variant: "destructive"
          });
          return;
        }
        
        console.log('✅ Signal generation completed');
        
        // Delayed refresh to avoid connection spam
        setTimeout(fetchSignals, 2000);
        
        toast({
          title: "Signal Generation Complete",
          description: `Generated ${signalResult?.stats?.signalsGenerated || 0} new signals`,
        });
        
      } catch (error) {
        console.error('❌ Error in signal generation:', error);
        toast({
          title: "Generation Error",
          description: "Failed to detect new trading opportunities",
          variant: "destructive"
        });
      }
    });
  }, [queueRequest, fetchSignals, toast]);

  useEffect(() => {
    // Initial fetch
    fetchSignals();
    
    // Single shared real-time subscription instead of 27+ individual ones
    const signalsChannel = supabase
      .channel('emergency-signals-batch')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log('📡 Batched signal change detected:', payload.eventType);
          // Debounced refresh - only refresh once every 3 seconds
          setTimeout(fetchSignals, 3000);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Emergency signals subscription: ${status}`);
      });

    // Much less frequent automatic refresh (every 2 minutes instead of constant)
    const updateInterval = setInterval(fetchSignals, 2 * 60 * 1000);

    return () => {
      supabase.removeChannel(signalsChannel);
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
      await queueRequest(async () => {
        try {
          console.log('🚀 Triggering market update (throttled)...');
          
          const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
          
          if (marketDataError) {
            console.error('❌ Market data update failed:', marketDataError);
            toast({
              title: "Update Failed",
              description: "Failed to fetch market data",
              variant: "destructive"
            });
            return;
          }
          
          console.log('✅ Market data updated');
          
          setTimeout(fetchSignals, 3000);
          
          toast({
            title: "Market Update Complete",
            description: "Market data refreshed successfully",
          });
          
        } catch (error) {
          console.error('❌ Error in market updates:', error);
          toast({
            title: "Update Error",
            description: "Failed to update market data",
            variant: "destructive"
          });
        }
      });
    }, [queueRequest, fetchSignals, toast])
  };
};
