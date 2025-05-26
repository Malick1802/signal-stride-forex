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
}

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = useCallback(async () => {
    try {
      console.log('Fetching trading signals...');
      
      const { data: activeSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching signals:', error);
        return;
      }

      if (activeSignals && activeSignals.length > 0) {
        console.log(`Found ${activeSignals.length} active signals`);
        
        // Get current market prices for chart data
        const symbols = activeSignals
          .filter(signal => signal?.symbol)
          .map(signal => signal.symbol);
          
        const { data: marketData } = await supabase
          .from('live_market_data')
          .select('*')
          .in('symbol', symbols)
          .order('created_at', { ascending: false })
          .limit(500);

        const transformedSignals = activeSignals
          .filter(signal => signal?.id && signal?.symbol && signal?.type && signal?.price !== null)
          .map(signal => {
            try {
              // Get market data for this symbol
              const symbolMarketData = marketData?.filter(md => 
                md?.symbol === signal.symbol
              ).slice(0, 30) || [];
              
              const currentMarketPrice = symbolMarketData[0]?.price;
              const entryPrice = currentMarketPrice ? 
                parseFloat(currentMarketPrice.toString()).toFixed(5) : 
                parseFloat(signal.price.toString()).toFixed(5);

              // Generate chart data from market data or fallback
              const chartData = symbolMarketData.length > 0 ? 
                symbolMarketData.reverse().map((md, i) => ({
                  time: i,
                  price: parseFloat(md.price.toString())
                })) :
                Array.from({ length: 20 }, (_, i) => ({
                  time: i,
                  price: parseFloat(signal.price.toString()) + (Math.sin(i / 4) * 0.0001)
                }));

              return {
                id: signal.id,
                pair: signal.symbol,
                type: signal.type,
                entryPrice: entryPrice,
                stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
                takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
                takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
                takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
                confidence: Math.floor(signal.confidence || 85),
                timestamp: signal.created_at || new Date().toISOString(),
                status: signal.status || 'active',
                analysisText: signal.analysis_text || 'High-confidence trading opportunity detected',
                chartData: chartData
              };
            } catch (error) {
              console.error('Error transforming signal:', error);
              return null;
            }
          })
          .filter(Boolean) as TradingSignal[];

        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
      } else {
        console.log('No active signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAutomaticSignalGeneration = useCallback(async () => {
    try {
      console.log('Triggering market data update...');
      
      // Update market data first
      const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      if (marketDataError) {
        console.warn('Market data update had issues:', marketDataError);
      }
      
      // Wait a moment for data to be inserted
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Triggering signal generation...');
      const { data, error } = await supabase.functions.invoke('generate-signals');
      
      if (error) {
        console.error('Signal generation error:', error);
        return;
      }

      if (data?.signals && data.signals.length > 0) {
        console.log(`Generated ${data.signals.length} new signals`);
        toast({
          title: "New Signals Generated!",
          description: `${data.signals.length} high-confidence opportunities detected`,
        });
        
        // Refresh signals after generation
        setTimeout(fetchSignals, 2000);
      } else {
        console.log('No new signals generated this cycle');
      }
      
    } catch (error) {
      console.error('Error in signal generation:', error);
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Set up real-time subscription for signals
    const signalsChannel = supabase
      .channel('trading-signals-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('Real-time signal update:', payload);
          fetchSignals();
        }
      )
      .subscribe();

    // Set up real-time subscription for market data
    const marketChannel = supabase
      .channel('market-data-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data'
        },
        (payload) => {
          console.log('Real-time market data update:', payload);
          // Update signals with new market data immediately
          setTimeout(fetchSignals, 200);
        }
      )
      .subscribe();

    // Automatic market data and signal generation with enhanced frequency
    const checkMarketHours = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcDay = now.getUTCDay();
      
      return (utcDay >= 1 && utcDay <= 4) || 
             (utcDay === 0 && utcHour >= 22) || 
             (utcDay === 5 && utcHour < 22);
    };

    // Enhanced market data updates: every 15 seconds during market hours, 30 seconds when closed
    const marketDataInterval = setInterval(async () => {
      const isMarketOpen = checkMarketHours();
      try {
        console.log(`Triggering market data update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
        await supabase.functions.invoke('fetch-market-data');
      } catch (error) {
        console.error('Automatic market data update failed:', error);
      }
    }, checkMarketHours() ? 15000 : 30000);

    // Signal generation every 3 minutes for more responsive signals
    const signalGenerationInterval = setInterval(() => {
      triggerAutomaticSignalGeneration();
    }, 180000);

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(marketChannel);
      clearInterval(marketDataInterval);
      clearInterval(signalGenerationInterval);
    };
  }, [fetchSignals, triggerAutomaticSignalGeneration]);

  return {
    signals,
    loading,
    lastUpdate,
    fetchSignals,
    triggerAutomaticSignalGeneration
  };
};
