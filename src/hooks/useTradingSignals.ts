
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

  const ensureMarketDataAvailable = async (symbols: string[], maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔍 Checking for market data, attempt ${attempt}/${maxRetries}`);
      
      try {
        // Use a more generous time window - start with 30 minutes
        const timeWindow = attempt === 1 ? 30 : attempt === 2 ? 60 : 120; // 30min, 1hr, 2hr
        const timeAgo = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
        
        const { data: recentData, error: recentError } = await supabase
          .from('live_market_data')
          .select('symbol, price, created_at, timestamp')
          .gte('created_at', timeAgo)
          .order('created_at', { ascending: false })
          .limit(200);

        if (recentError) {
          console.error('❌ Database query error:', recentError);
          throw recentError;
        }

        console.log(`📊 Database query returned ${recentData?.length || 0} recent records (${timeWindow}min window)`);
        
        if (recentData && recentData.length > 0) {
          console.log(`✅ Sample data found:`, recentData.slice(0, 3).map(d => `${d.symbol}:${d.price} at ${d.created_at}`));
          
          const availableSymbols = new Set(recentData.map(d => d.symbol));
          const foundSymbols = symbols.filter(s => availableSymbols.has(s));
          
          console.log(`📈 Found data for ${foundSymbols.length}/${symbols.length} symbols: [${foundSymbols.join(', ')}]`);
          
          // If we have data for at least 30% of symbols, proceed
          if (foundSymbols.length >= Math.floor(symbols.length * 0.3)) {
            console.log(`✅ Sufficient market data available (${foundSymbols.length}/${symbols.length})`);
            return recentData;
          }
        }
        
        // If first or second attempt and insufficient data, trigger fresh fetch
        if (attempt <= 2) {
          console.log('🔄 Insufficient data found, triggering fresh market data fetch...');
          
          try {
            const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-market-data');
            if (fetchError) {
              console.error('❌ Market data fetch error:', fetchError);
            } else {
              console.log('✅ Market data fetch completed:', fetchResult);
              
              // Wait longer for data to be inserted and available
              const waitTime = 8000; // 8 seconds
              console.log(`⏳ Waiting ${waitTime}ms for data insertion...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              // Try immediate query after waiting
              const { data: freshData } = await supabase
                .from('live_market_data')
                .select('symbol, price, created_at, timestamp')
                .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 min window
                .order('created_at', { ascending: false })
                .limit(100);
                
              if (freshData && freshData.length > 0) {
                console.log(`✅ Fresh data retrieved: ${freshData.length} records`);
                return freshData;
              }
            }
          } catch (error) {
            console.error('❌ Failed to invoke market data fetch:', error);
          }
        }
        
        // Progressive wait times: 3s, 6s, 10s
        const waitTime = attempt * 3000;
        console.log(`⏳ Waiting ${waitTime}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (error) {
        console.error(`❌ Error in attempt ${attempt}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final attempt with very wide time window (6 hours)
    console.log('🔍 Final attempt with 6-hour window...');
    const { data: finalData } = await supabase
      .from('live_market_data')
      .select('symbol, price, created_at, timestamp')
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(500);
      
    console.log(`📊 Final attempt found ${finalData?.length || 0} records`);
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
        setSignals([]);
        return;
      }

      if (!activeSignals || activeSignals.length === 0) {
        console.log('📭 No active signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      console.log(`📊 Found ${activeSignals.length} active signals`);
      
      const symbols = [...new Set(activeSignals
        .filter(signal => signal?.symbol)
        .map(signal => signal.symbol))];
        
      console.log('🔍 Ensuring market data availability for symbols:', symbols);
      
      try {
        const marketData = await ensureMarketDataAvailable(symbols);
        
        if (!marketData || marketData.length === 0) {
          console.warn('⚠️ No market data available - hiding all signals');
          setSignals([]);
          setLastUpdate(new Date().toLocaleTimeString());
          return;
        }

        // Group market data by symbol, keeping the most recent for each
        const marketDataBySymbol = marketData.reduce((acc, item) => {
          if (!acc[item.symbol] || new Date(item.created_at) > new Date(acc[item.symbol].created_at)) {
            acc[item.symbol] = item;
          }
          return acc;
        }, {} as Record<string, any>);

        console.log(`📊 Market data available for symbols: [${Object.keys(marketDataBySymbol).join(', ')}]`);

        // Only show signals that have real market data
        const validSignals = activeSignals.filter(signal => {
          const hasValidData = signal?.id && signal?.symbol && signal?.type && marketDataBySymbol[signal.symbol];
          if (!hasValidData) {
            console.log(`⚠️ Excluding signal ${signal?.symbol || 'unknown'} - no market data available`);
          }
          return hasValidData;
        });

        console.log(`✅ Processing ${validSignals.length}/${activeSignals.length} signals with market data`);

        const transformedSignals = validSignals.map(signal => {
          try {
            const latestMarketData = marketDataBySymbol[signal.symbol];
            const currentMarketPrice = parseFloat(latestMarketData.price.toString());
            
            // Create chart data from current price with small variations
            const chartData = Array.from({ length: 30 }, (_, i) => ({
              time: i,
              price: currentMarketPrice * (1 + (Math.random() - 0.5) * 0.002)
            }));

            return {
              id: signal.id,
              pair: signal.symbol,
              type: signal.type,
              entryPrice: currentMarketPrice.toFixed(5),
              stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
              takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
              takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
              takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
              confidence: Math.floor(signal.confidence || 85),
              timestamp: signal.created_at || new Date().toISOString(),
              status: signal.status || 'active',
              analysisText: signal.analysis_text || `Real-time ${signal.type} signal for ${signal.symbol}`,
              chartData: chartData
            };
          } catch (error) {
            console.error(`❌ Error transforming signal for ${signal.symbol}:`, error);
            return null;
          }
        }).filter(Boolean) as TradingSignal[];

        console.log(`✅ Successfully processed ${transformedSignals.length} signals with real market data`);
        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        if (transformedSignals.length > 0) {
          toast({
            title: "Real-Time Signals Loaded",
            description: `${transformedSignals.length} signals with live market data`,
          });
        }
        
      } catch (error) {
        console.error('❌ Error ensuring market data availability:', error);
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('❌ Error in fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const triggerAutomaticSignalGeneration = useCallback(async () => {
    try {
      console.log('🚀 Triggering comprehensive market update...');
      
      // First ensure fresh market data
      console.log('📡 Ensuring fresh market data...');
      const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      if (marketDataError) {
        console.error('❌ Market data update failed:', marketDataError);
        toast({
          title: "Update Failed",
          description: "Failed to fetch latest market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('⏳ Waiting for market data to be processed...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // Then refresh signals
      await fetchSignals();
      
    } catch (error) {
      console.error('❌ Error in signal generation:', error);
      toast({
        title: "Update Error",
        description: "Failed to update signals",
        variant: "destructive"
      });
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Real-time subscriptions
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
          console.log('🔔 Real-time market data update for:', payload.new?.symbol);
          setTimeout(fetchSignals, 5000); // Wait a bit longer for data consistency
        }
      )
      .subscribe();

    // Periodic market data updates - reduced frequency to avoid overwhelming
    const marketOpen = checkMarketHours();
    const updateInterval = setInterval(async () => {
      const isMarketOpen = checkMarketHours();
      console.log(`🕒 Scheduled update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
      
      try {
        const { error } = await supabase.functions.invoke('fetch-market-data');
        if (error) {
          console.error('❌ Scheduled update error:', error);
        } else {
          console.log('✅ Scheduled update successful');
          setTimeout(fetchSignals, 8000); // Wait for data to be available
        }
      } catch (error) {
        console.error('❌ Scheduled update failed:', error);
      }
    }, marketOpen ? 60000 : 180000); // 1min during market hours, 3min when closed

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(marketChannel);
      clearInterval(updateInterval);
    };
  }, [fetchSignals]);

  return {
    signals,
    loading,
    lastUpdate,
    fetchSignals,
    triggerAutomaticSignalGeneration
  };
};
