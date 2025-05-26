
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

  // Check market hours function
  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    return (utcDay >= 1 && utcDay <= 4) || 
           (utcDay === 0 && utcHour >= 22) || 
           (utcDay === 5 && utcHour < 22);
  };

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
        
        // Get current market prices for chart data - with improved querying
        const symbols = activeSignals
          .filter(signal => signal?.symbol)
          .map(signal => signal.symbol);
          
        console.log('Looking for market data for symbols:', symbols);
        
        // Try to get the most recent market data with a more flexible approach
        let marketData = null;
        
        // First, try to get recent data (last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        const { data: recentData } = await supabase
          .from('live_market_data')
          .select('*')
          .in('symbol', symbols)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(5000);

        if (recentData && recentData.length > 0) {
          marketData = recentData;
          console.log(`Found ${marketData.length} recent market data records (last 30 min)`);
        } else {
          // Fallback: get any available data from last 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          
          const { data: olderData } = await supabase
            .from('live_market_data')
            .select('*')
            .in('symbol', symbols)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(5000);

          if (olderData && olderData.length > 0) {
            marketData = olderData;
            console.log(`Found ${marketData.length} older market data records (last 24h)`);
          }
        }

        // If still no data, trigger market data fetch but don't wait too long
        if (!marketData || marketData.length === 0) {
          console.log('No market data found, triggering fresh data fetch');
          
          try {
            const { error: updateError } = await supabase.functions.invoke('fetch-market-data');
            if (!updateError) {
              console.log('Fresh market data requested successfully');
              
              // Wait a shorter time and try once more
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const { data: freshData } = await supabase
                .from('live_market_data')
                .select('*')
                .in('symbol', symbols)
                .order('created_at', { ascending: false })
                .limit(1000);
                
              if (freshData && freshData.length > 0) {
                marketData = freshData;
                console.log(`Found ${freshData.length} fresh market data records`);
              }
            }
          } catch (fetchError) {
            console.error('Error fetching fresh market data:', fetchError);
          }
        }

        const transformedSignals = activeSignals
          .filter(signal => signal?.id && signal?.symbol && signal?.type && signal?.price !== null)
          .map(signal => {
            try {
              console.log(`Processing signal for ${signal.symbol}...`);
              
              // Get market data for this symbol - use the most recent price available
              const symbolMarketData = marketData?.filter(md => 
                md?.symbol === signal.symbol
              ) || [];
              
              let currentMarketPrice = null;
              let chartData = [];
              
              if (symbolMarketData.length > 0) {
                console.log(`Found ${symbolMarketData.length} market data points for ${signal.symbol}`);
                
                // Sort by timestamp to get the most recent price
                const sortedData = symbolMarketData.sort((a, b) => 
                  new Date(b.created_at || b.timestamp).getTime() - 
                  new Date(a.created_at || a.timestamp).getTime()
                );
                
                currentMarketPrice = sortedData[0]?.price;
                
                // Create chart data from available market data
                chartData = sortedData.slice(0, 50).reverse().map((md, i) => ({
                  time: i,
                  price: parseFloat(md.price.toString())
                }));
              } else {
                console.log(`No recent market data found for ${signal.symbol}, using signal price`);
              }

              const entryPrice = currentMarketPrice ? 
                parseFloat(currentMarketPrice.toString()).toFixed(5) : 
                parseFloat(signal.price.toString()).toFixed(5);

              // Generate fallback chart data if no market data available
              if (chartData.length === 0) {
                const basePrice = parseFloat(signal.price.toString());
                chartData = Array.from({ length: 30 }, (_, i) => {
                  const volatility = 0.0002;
                  const trend = (Math.random() - 0.5) * volatility;
                  const noise = (Math.random() - 0.5) * volatility * 0.1;
                  return {
                    time: i,
                    price: basePrice + trend * i + noise
                  };
                });
              }

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
      console.log('Triggering comprehensive market update...');
      
      // Update market data first
      let marketDataSuccess = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Market data update attempt ${attempt}/2`);
          const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
          if (!marketDataError) {
            console.log('Market data update completed successfully');
            marketDataSuccess = true;
            break;
          } else {
            console.warn(`Market data update attempt ${attempt} failed:`, marketDataError);
          }
        } catch (error) {
          console.warn(`Market data update attempt ${attempt} error:`, error);
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!marketDataSuccess) {
        console.warn('Market data update failed, continuing with signal generation');
      }
      
      // Wait for data to be available
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        setTimeout(fetchSignals, 3000);
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
          setTimeout(fetchSignals, 1000);
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
          setTimeout(fetchSignals, 1500);
        }
      )
      .subscribe();

    // Market data updates with better error handling
    const marketDataInterval = setInterval(async () => {
      const isMarketOpen = checkMarketHours();
      try {
        console.log(`Triggering scheduled market data update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
        const { error } = await supabase.functions.invoke('fetch-market-data');
        if (error) {
          console.error('Scheduled market data update error:', error);
        } else {
          console.log('Scheduled market data update successful');
          setTimeout(fetchSignals, 2000);
        }
      } catch (error) {
        console.error('Scheduled market data update failed:', error);
      }
    }, isMarketOpen ? 20000 : 45000); // 20 seconds during market hours, 45 seconds when closed

    // Signal generation every 5 minutes
    const signalGenerationInterval = setInterval(() => {
      const delay = Math.random() * 5000; // 0-5 seconds random delay
      setTimeout(triggerAutomaticSignalGeneration, delay);
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
