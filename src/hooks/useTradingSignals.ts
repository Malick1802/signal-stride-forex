
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
        
        // Get current market prices for chart data - use broader time window and more data
        const symbols = activeSignals
          .filter(signal => signal?.symbol)
          .map(signal => signal.symbol);
          
        console.log('Looking for market data for symbols:', symbols);
        
        // Fetch data from the last 2 hours to ensure we have recent data
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        
        const { data: marketData } = await supabase
          .from('live_market_data')
          .select('*')
          .in('symbol', symbols)
          .gte('created_at', twoHoursAgo)
          .order('created_at', { ascending: false })
          .limit(5000); // Much higher limit

        console.log('Market data found:', marketData?.length || 0, 'records');
        console.log('Market data query time window: last 2 hours');
        if (marketData && marketData.length > 0) {
          console.log('Sample market data symbols:', marketData.slice(0, 5).map(md => md.symbol));
          console.log('Latest market data timestamp:', marketData[0]?.created_at);
          console.log('Market data distribution:', 
            symbols.map(symbol => ({
              symbol,
              count: marketData.filter(md => md.symbol === symbol).length
            }))
          );
        }

        const transformedSignals = activeSignals
          .filter(signal => signal?.id && signal?.symbol && signal?.type && signal?.price !== null)
          .map(signal => {
            try {
              console.log(`Processing signal for ${signal.symbol}...`);
              
              // Get market data for this symbol
              const symbolMarketData = marketData?.filter(md => 
                md?.symbol === signal.symbol
              ).slice(0, 100) || []; // Get more data points
              
              if (symbolMarketData.length === 0) {
                console.log(`No recent market data found for ${signal.symbol}, using signal price`);
              } else {
                console.log(`Found ${symbolMarketData.length} recent market data points for ${signal.symbol}`);
              }
              
              const currentMarketPrice = symbolMarketData[0]?.price;
              const entryPrice = currentMarketPrice ? 
                parseFloat(currentMarketPrice.toString()).toFixed(5) : 
                parseFloat(signal.price.toString()).toFixed(5);

              // Generate chart data from market data or create fallback
              const chartData = symbolMarketData.length > 0 ? 
                symbolMarketData.reverse().map((md, i) => ({
                  time: i,
                  price: parseFloat(md.price.toString())
                })) :
                Array.from({ length: 30 }, (_, i) => ({
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
      } else {
        console.log('Market data update completed successfully');
      }
      
      // Wait longer for data to be inserted and become available
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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
        
        // Refresh signals after generation with longer delay
        setTimeout(fetchSignals, 6000);
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
          // Update signals with new market data with longer delay
          setTimeout(fetchSignals, 2000);
        }
      )
      .subscribe();

    // Check market hours function
    const checkMarketHours = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcDay = now.getUTCDay();
      
      return (utcDay >= 1 && utcDay <= 4) || 
             (utcDay === 0 && utcHour >= 22) || 
             (utcDay === 5 && utcHour < 22);
    };

    // More frequent market data updates for better data availability
    const marketDataInterval = setInterval(async () => {
      const isMarketOpen = checkMarketHours();
      try {
        console.log(`Triggering market data update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
        const { error } = await supabase.functions.invoke('fetch-market-data');
        if (error) {
          console.error('Market data update error:', error);
        } else {
          console.log('Market data update successful');
          // Refresh signals after market data update
          setTimeout(fetchSignals, 3000);
        }
      } catch (error) {
        console.error('Automatic market data update failed:', error);
      }
    }, checkMarketHours() ? 30000 : 60000); // 30 seconds during market hours, 1 minute when closed

    // Signal generation every 5 minutes
    const signalGenerationInterval = setInterval(() => {
      triggerAutomaticSignalGeneration();
    }, 300000);

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
