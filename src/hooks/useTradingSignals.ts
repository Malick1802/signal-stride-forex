
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

  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    return (utcDay >= 1 && utcDay <= 5) && 
           (utcDay !== 5 || utcHour < 22) && 
           (utcDay !== 1 || utcHour >= 22);
  };

  const ensureMarketDataAvailable = async (symbols: string[], maxRetries = 5) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Checking for market data, attempt ${attempt}/${maxRetries}`);
      
      // Check for market data in last 10 minutes (more generous window)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: existingData, error: queryError } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at')
        .in('symbol', symbols)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Database query error:', queryError);
        if (attempt === maxRetries) throw queryError;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      const availableSymbols = new Set(existingData?.map(d => d.symbol) || []);
      const missingSymbols = symbols.filter(s => !availableSymbols.has(s));
      
      console.log(`Found data for ${availableSymbols.size}/${symbols.length} symbols`);
      
      if (missingSymbols.length === 0) {
        console.log('All required market data is available');
        return existingData;
      }
      
      if (attempt === 1) {
        console.log(`Missing data for symbols: ${missingSymbols.join(', ')}, fetching fresh data`);
        
        try {
          const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-market-data');
          if (fetchError) {
            console.error('Market data fetch error:', fetchError);
          } else {
            console.log('Market data fetch successful:', fetchResult);
          }
        } catch (error) {
          console.error('Failed to trigger market data fetch:', error);
        }
      }
      
      // Progressive wait times: 3s, 4s, 6s, 8s, 10s
      const delay = attempt <= 2 ? attempt * 2000 + 1000 : attempt * 2000;
      console.log(`Waiting ${delay}ms before next check...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Final check with even wider time window
    const { data: finalData } = await supabase
      .from('live_market_data')
      .select('symbol, price, created_at')
      .in('symbol', symbols)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
      
    console.log(`Final check: found ${finalData?.length || 0} total market data records`);
    return finalData || [];
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
        
        const symbols = activeSignals
          .filter(signal => signal?.symbol)
          .map(signal => signal.symbol);
          
        console.log('Ensuring market data availability for symbols:', symbols);
        
        try {
          const marketData = await ensureMarketDataAvailable(symbols);
          
          if (!marketData || marketData.length === 0) {
            console.warn('No market data available after retries, signals may use stale prices');
            setSignals([]);
            setLastUpdate(new Date().toLocaleTimeString());
            return;
          }

          console.log(`Processing signals with ${marketData.length} market data points`);

          const marketDataBySymbol = marketData.reduce((acc, item) => {
            if (!acc[item.symbol]) acc[item.symbol] = [];
            acc[item.symbol].push(item);
            return acc;
          }, {} as Record<string, any[]>);

          const transformedSignals = activeSignals
            .filter(signal => signal?.id && signal?.symbol && signal?.type && signal?.price !== null)
            .map(signal => {
              try {
                console.log(`Processing signal for ${signal.symbol}...`);
                
                const symbolMarketData = marketDataBySymbol[signal.symbol];
                
                if (!symbolMarketData || symbolMarketData.length === 0) {
                  console.warn(`No market data found for ${signal.symbol} - skipping`);
                  return null;
                }

                symbolMarketData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                const latestMarketData = symbolMarketData[0];
                const currentMarketPrice = parseFloat(latestMarketData.price.toString());
                
                console.log(`Using real market data for ${signal.symbol}: ${currentMarketPrice}`);
                
                const chartData = symbolMarketData.slice(0, 30).reverse().map((md, i) => ({
                  time: i,
                  price: parseFloat(md.price.toString())
                }));

                const entryPrice = currentMarketPrice.toFixed(5);

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
                  analysisText: signal.analysis_text || 'High-confidence trading opportunity with real-time market data',
                  chartData: chartData
                };
              } catch (error) {
                console.error('Error transforming signal:', error);
                return null;
              }
            })
            .filter(Boolean) as TradingSignal[];

          console.log(`Successfully processed ${transformedSignals.length} signals with real market data`);
          setSignals(transformedSignals);
          setLastUpdate(new Date().toLocaleTimeString());
          
          if (transformedSignals.length > 0) {
            toast({
              title: "Real-Time Signals Updated",
              description: `${transformedSignals.length} signals with live market data`,
            });
          }
          
        } catch (error) {
          console.error('Error ensuring market data:', error);
          setSignals([]);
          setLastUpdate(new Date().toLocaleTimeString());
        }
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
  }, [toast]);

  const triggerAutomaticSignalGeneration = useCallback(async () => {
    try {
      console.log('Triggering comprehensive market update...');
      
      console.log('Ensuring fresh market data...');
      const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      if (marketDataError) {
        console.error('Market data update failed:', marketDataError);
        return;
      }
      
      console.log('Waiting for market data to be processed...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
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
        
        setTimeout(fetchSignals, 10000);
      } else {
        console.log('No new signals generated this cycle');
      }
      
    } catch (error) {
      console.error('Error in signal generation:', error);
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
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
          setTimeout(fetchSignals, 5000);
        }
      )
      .subscribe();

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
          setTimeout(fetchSignals, 3000);
        }
      )
      .subscribe();

    const marketOpen = checkMarketHours();
    const marketDataInterval = setInterval(async () => {
      try {
        const isMarketOpen = checkMarketHours();
        console.log(`Triggering scheduled market data update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
        
        const { error } = await supabase.functions.invoke('fetch-market-data');
        if (error) {
          console.error('Scheduled market data update error:', error);
        } else {
          console.log('Scheduled market data update successful');
          setTimeout(fetchSignals, 8000);
        }
      } catch (error) {
        console.error('Scheduled market data update failed:', error);
      }
    }, marketOpen ? 10000 : 30000); // 10 seconds during market hours, 30 seconds when closed

    const signalGenerationInterval = setInterval(() => {
      const isMarketOpen = checkMarketHours();
      if (isMarketOpen) {
        const delay = Math.random() * 5000;
        setTimeout(triggerAutomaticSignalGeneration, delay);
      } else {
        console.log('Market closed - skipping signal generation');
      }
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
