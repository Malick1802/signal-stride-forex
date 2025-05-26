
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
      
      // Use a more generous time window and simpler query
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: existingData, error: queryError } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at, timestamp')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Database query error:', queryError);
        if (attempt === maxRetries) throw queryError;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      console.log(`Raw database query returned ${existingData?.length || 0} total records`);
      
      if (existingData && existingData.length > 0) {
        // Log first few records to debug
        console.log('Sample records:', existingData.slice(0, 3));
        
        const availableSymbols = new Set(existingData.map(d => d.symbol));
        const missingSymbols = symbols.filter(s => !availableSymbols.has(s));
        
        console.log(`Available symbols: [${Array.from(availableSymbols).join(', ')}]`);
        console.log(`Required symbols: [${symbols.join(', ')}]`);
        console.log(`Missing symbols: [${missingSymbols.join(', ')}]`);
        
        if (missingSymbols.length === 0) {
          console.log('✅ All required market data is available');
          return existingData;
        }
        
        if (missingSymbols.length < symbols.length / 2) {
          console.log(`✅ Found data for ${availableSymbols.size}/${symbols.length} symbols - proceeding with available data`);
          return existingData;
        }
      }
      
      if (attempt === 1) {
        console.log('🔄 Triggering fresh market data fetch...');
        
        try {
          const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-market-data');
          if (fetchError) {
            console.error('❌ Market data fetch error:', fetchError);
          } else {
            console.log('✅ Market data fetch successful:', fetchResult);
          }
        } catch (error) {
          console.error('❌ Failed to trigger market data fetch:', error);
        }
      }
      
      // Progressive wait times with longer delays
      const delay = Math.min(attempt * 3000, 12000); // 3s, 6s, 9s, 12s, 12s
      console.log(`⏳ Waiting ${delay}ms before next check...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Final fallback check with wider time window
    console.log('🔍 Final fallback check with 30-minute window...');
    const { data: finalData } = await supabase
      .from('live_market_data')
      .select('symbol, price, created_at, timestamp')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
      
    console.log(`Final fallback: found ${finalData?.length || 0} total market data records`);
    return finalData || [];
  };

  const fetchSignals = useCallback(async () => {
    try {
      console.log('🔄 Fetching trading signals...');
      
      const { data: activeSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error fetching signals:', error);
        return;
      }

      if (activeSignals && activeSignals.length > 0) {
        console.log(`📊 Found ${activeSignals.length} active signals`);
        
        const symbols = activeSignals
          .filter(signal => signal?.symbol)
          .map(signal => signal.symbol);
          
        console.log('🔍 Ensuring market data availability for symbols:', symbols);
        
        try {
          const marketData = await ensureMarketDataAvailable(symbols);
          
          if (!marketData || marketData.length === 0) {
            console.warn('⚠️ No market data available after all retries');
            setSignals([]);
            setLastUpdate(new Date().toLocaleTimeString());
            return;
          }

          console.log(`📈 Processing ${activeSignals.length} signals with ${marketData.length} market data points`);

          // Group market data by symbol, taking the most recent for each
          const marketDataBySymbol = marketData.reduce((acc, item) => {
            if (!acc[item.symbol] || new Date(item.created_at) > new Date(acc[item.symbol].created_at)) {
              acc[item.symbol] = item;
            }
            return acc;
          }, {} as Record<string, any>);

          console.log(`📊 Market data grouped for ${Object.keys(marketDataBySymbol).length} unique symbols`);

          const transformedSignals = activeSignals
            .filter(signal => {
              const hasData = signal?.id && signal?.symbol && signal?.type && signal?.price !== null;
              const hasMarketData = marketDataBySymbol[signal.symbol];
              
              if (!hasData) {
                console.warn(`⚠️ Invalid signal data for ${signal?.symbol || 'unknown'}`);
                return false;
              }
              
              if (!hasMarketData) {
                console.warn(`⚠️ No market data for ${signal.symbol} - skipping`);
                return false;
              }
              
              return true;
            })
            .map(signal => {
              try {
                const latestMarketData = marketDataBySymbol[signal.symbol];
                const currentMarketPrice = parseFloat(latestMarketData.price.toString());
                
                console.log(`💰 ${signal.symbol}: Using real market price ${currentMarketPrice}`);
                
                // Create simplified chart data from recent price
                const chartData = Array.from({ length: 30 }, (_, i) => ({
                  time: i,
                  price: currentMarketPrice * (1 + (Math.random() - 0.5) * 0.001) // Small random variation for demo
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
                  analysisText: signal.analysis_text || `Real-time ${signal.type} signal for ${signal.symbol} with live market data`,
                  chartData: chartData
                };
              } catch (error) {
                console.error(`❌ Error transforming signal for ${signal.symbol}:`, error);
                return null;
              }
            })
            .filter(Boolean) as TradingSignal[];

          console.log(`✅ Successfully processed ${transformedSignals.length}/${activeSignals.length} signals with real market data`);
          setSignals(transformedSignals);
          setLastUpdate(new Date().toLocaleTimeString());
          
          if (transformedSignals.length > 0) {
            toast({
              title: "Real-Time Signals Updated",
              description: `${transformedSignals.length} signals with live FastForex data`,
            });
          }
          
        } catch (error) {
          console.error('❌ Error ensuring market data:', error);
          setSignals([]);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } else {
        console.log('📭 No active signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('❌ Error fetching signals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const triggerAutomaticSignalGeneration = useCallback(async () => {
    try {
      console.log('🚀 Triggering comprehensive market update...');
      
      console.log('📡 Ensuring fresh market data...');
      const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      if (marketDataError) {
        console.error('❌ Market data update failed:', marketDataError);
        return;
      }
      
      console.log('⏳ Waiting for market data to be processed...');
      await new Promise(resolve => setTimeout(resolve, 12000)); // Increased wait time
      
      console.log('🤖 Triggering signal generation...');
      const { data, error } = await supabase.functions.invoke('generate-signals');
      
      if (error) {
        console.error('❌ Signal generation error:', error);
        return;
      }

      if (data?.signals && data.signals.length > 0) {
        console.log(`✅ Generated ${data.signals.length} new signals`);
        toast({
          title: "New Signals Generated!",
          description: `${data.signals.length} high-confidence opportunities detected`,
        });
        
        // Wait longer before refreshing signals
        setTimeout(fetchSignals, 15000);
      } else {
        console.log('ℹ️ No new signals generated this cycle');
      }
      
    } catch (error) {
      console.error('❌ Error in signal generation:', error);
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Real-time subscriptions for immediate updates
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
          console.log('🔔 Real-time signal update:', payload);
          setTimeout(fetchSignals, 3000);
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
          console.log('🔔 Real-time market data update received');
          setTimeout(fetchSignals, 2000);
        }
      )
      .subscribe();

    // Scheduled market data updates
    const marketOpen = checkMarketHours();
    const marketDataInterval = setInterval(async () => {
      try {
        const isMarketOpen = checkMarketHours();
        console.log(`🕒 Scheduled market data update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
        
        const { error } = await supabase.functions.invoke('fetch-market-data');
        if (error) {
          console.error('❌ Scheduled market data update error:', error);
        } else {
          console.log('✅ Scheduled market data update successful');
          setTimeout(fetchSignals, 5000);
        }
      } catch (error) {
        console.error('❌ Scheduled market data update failed:', error);
      }
    }, marketOpen ? 15000 : 60000); // 15 seconds during market hours, 1 minute when closed

    // Signal generation interval
    const signalGenerationInterval = setInterval(() => {
      const isMarketOpen = checkMarketHours();
      if (isMarketOpen) {
        console.log('🤖 Triggering automatic signal generation...');
        triggerAutomaticSignalGeneration();
      } else {
        console.log('🌙 Market closed - skipping signal generation');
      }
    }, 300000); // Every 5 minutes

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
