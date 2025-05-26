
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

  const ensureMarketDataAvailable = async (symbols: string[], maxRetries = 2) => {
    console.log(`🔍 Checking market data availability for ${symbols.length} symbols`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📊 Market data check, attempt ${attempt}/${maxRetries}`);
      
      try {
        // Start with a wide 3-hour window
        const timeWindow = attempt === 1 ? 180 : 360; // 3hr, then 6hr
        const timeAgo = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
        
        const { data: recentData, error: recentError } = await supabase
          .from('live_market_data')
          .select('symbol, price, created_at, timestamp')
          .gte('created_at', timeAgo)
          .order('created_at', { ascending: false })
          .limit(500);

        if (recentError) {
          console.error('❌ Database query error:', recentError);
          throw recentError;
        }

        console.log(`📈 Found ${recentData?.length || 0} records in ${timeWindow}min window`);
        
        if (recentData && recentData.length > 0) {
          const availableSymbols = new Set(recentData.map(d => d.symbol));
          const foundSymbols = symbols.filter(s => availableSymbols.has(s));
          
          console.log(`✅ Market data available for ${foundSymbols.length}/${symbols.length} symbols`);
          
          // Very low threshold - if we have data for any symbols, proceed
          if (foundSymbols.length > 0) {
            console.log(`✅ Proceeding with ${foundSymbols.length} symbols with data`);
            return recentData;
          }
        }
        
        // Only trigger fresh fetch on first attempt
        if (attempt === 1) {
          console.log('🔄 No recent data, triggering fresh market data fetch...');
          
          try {
            const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-market-data');
            if (fetchError) {
              console.error('❌ Market data fetch error:', fetchError);
            } else {
              console.log('✅ Fresh market data fetched');
              
              // Wait for data to be available
              const waitTime = 3000;
              console.log(`⏳ Waiting ${waitTime}ms for data insertion...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              // Quick check for fresh data
              const { data: freshData } = await supabase
                .from('live_market_data')
                .select('symbol, price, created_at, timestamp')
                .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(200);
                
              if (freshData && freshData.length > 0) {
                console.log(`✅ Fresh data available: ${freshData.length} records`);
                return freshData;
              }
            }
          } catch (error) {
            console.error('❌ Failed to fetch fresh market data:', error);
          }
        }
        
        const waitTime = attempt * 2000;
        console.log(`⏳ Waiting ${waitTime}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (error) {
        console.error(`❌ Error in attempt ${attempt}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Final fallback - get ANY recent market data regardless of time
    console.log('🔍 Final fallback: getting most recent data for each symbol...');
    try {
      const { data: fallbackData } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at, timestamp')
        .order('created_at', { ascending: false })
        .limit(1000);
        
      if (fallbackData && fallbackData.length > 0) {
        console.log(`📊 Fallback found ${fallbackData.length} total records`);
        
        // Get the most recent record for each symbol
        const latestBySymbol = fallbackData.reduce((acc, item) => {
          if (!acc[item.symbol] || new Date(item.created_at) > new Date(acc[item.symbol].created_at)) {
            acc[item.symbol] = item;
          }
          return acc;
        }, {} as Record<string, any>);
        
        const uniqueData = Object.values(latestBySymbol);
        console.log(`✅ Using fallback data: ${uniqueData.length} unique symbols`);
        return uniqueData;
      }
    } catch (error) {
      console.error('❌ Fallback query failed:', error);
    }
      
    console.log('❌ No market data available at all');
    return [];
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
        
      console.log('🔍 Getting market data for symbols:', symbols);
      
      try {
        const marketData = await ensureMarketDataAvailable(symbols);
        
        // Be more lenient - proceed even with minimal data
        if (!marketData || marketData.length === 0) {
          console.warn('⚠️ No market data available - proceeding with demo data');
          // Create basic chart data for signals without market data
          const demoSignals = activeSignals.slice(0, 5).map(signal => {
            const demoPrice = signal.symbol.includes('JPY') ? 150 : 1.1;
            const chartData = Array.from({ length: 30 }, (_, i) => ({
              time: i,
              price: demoPrice * (1 + (Math.random() - 0.5) * 0.002)
            }));

            return {
              id: signal.id,
              pair: signal.symbol,
              type: signal.type,
              entryPrice: demoPrice.toFixed(5),
              stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
              takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
              takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
              takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
              confidence: Math.floor(signal.confidence || 85),
              timestamp: signal.created_at || new Date().toISOString(),
              status: signal.status || 'active',
              analysisText: signal.analysis_text || `Demo ${signal.type} signal for ${signal.symbol}`,
              chartData: chartData
            };
          });
          
          setSignals(demoSignals);
          setLastUpdate(new Date().toLocaleTimeString());
          return;
        }

        // Group market data by symbol
        const marketDataBySymbol = marketData.reduce((acc, item) => {
          if (!acc[item.symbol] || new Date(item.created_at) > new Date(acc[item.symbol].created_at)) {
            acc[item.symbol] = item;
          }
          return acc;
        }, {} as Record<string, any>);

        console.log(`📊 Market data grouped for symbols: [${Object.keys(marketDataBySymbol).join(', ')}]`);

        // Process all signals, use demo data for those without market data
        const transformedSignals = activeSignals.map(signal => {
          try {
            const latestMarketData = marketDataBySymbol[signal.symbol];
            let currentMarketPrice;
            
            if (latestMarketData) {
              currentMarketPrice = parseFloat(latestMarketData.price.toString());
              console.log(`📈 Using real price for ${signal.symbol}: ${currentMarketPrice}`);
            } else {
              // Use demo price for signals without market data
              currentMarketPrice = signal.symbol.includes('JPY') ? 150 : 1.1;
              console.log(`📊 Using demo price for ${signal.symbol}: ${currentMarketPrice}`);
            }
            
            // Create chart data
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
              analysisText: signal.analysis_text || `AI ${signal.type} signal for ${signal.symbol}`,
              chartData: chartData
            };
          } catch (error) {
            console.error(`❌ Error transforming signal for ${signal.symbol}:`, error);
            return null;
          }
        }).filter(Boolean) as TradingSignal[];

        console.log(`✅ Successfully processed ${transformedSignals.length} signals`);
        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        if (transformedSignals.length > 0) {
          toast({
            title: "Signals Loaded",
            description: `${transformedSignals.length} trading signals available`,
          });
        }
        
      } catch (error) {
        console.error('❌ Error processing market data:', error);
        // Don't hide signals on error, show them anyway
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
          setTimeout(fetchSignals, 2000);
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
          setTimeout(fetchSignals, 3000);
        }
      )
      .subscribe();

    // Reduced polling frequency
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
          setTimeout(fetchSignals, 5000);
        }
      } catch (error) {
        console.error('❌ Scheduled update failed:', error);
      }
    }, marketOpen ? 120000 : 300000); // 2min during market hours, 5min when closed

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
