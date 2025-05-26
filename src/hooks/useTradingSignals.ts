
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

  const ensureMarketDataAvailable = async (symbols: string[]) => {
    console.log(`🔍 Checking market data for ${symbols.length} symbols`);
    
    try {
      // Check for data in the last hour first
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentData, error: recentError } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at, timestamp')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(200);

      if (recentError) {
        console.error('❌ Database query error:', recentError);
      }

      console.log(`📈 Found ${recentData?.length || 0} records in last hour`);
      
      if (recentData && recentData.length > 0) {
        return recentData;
      }
      
      // If no data in last hour, try last 6 hours
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      
      const { data: olderData, error: olderError } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at, timestamp')
        .gte('created_at', sixHoursAgo)
        .order('created_at', { ascending: false })
        .limit(500);
        
      if (olderError) {
        console.error('❌ Older data query error:', olderError);
      }
      
      console.log(`📊 Found ${olderData?.length || 0} records in last 6 hours`);
      
      if (olderData && olderData.length > 0) {
        return olderData;
      }
      
      // If still no data, trigger market data fetch
      console.log('🔄 No recent data, triggering fresh market data fetch...');
      
      try {
        const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-market-data');
        
        if (fetchError) {
          console.error('❌ Market data fetch failed:', fetchError);
        } else {
          console.log('✅ Fresh market data fetched:', fetchResult);
          
          // Wait a bit for data to be inserted
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Try to get the fresh data
          const { data: freshData } = await supabase
            .from('live_market_data')
            .select('symbol, price, created_at, timestamp')
            .order('created_at', { ascending: false })
            .limit(200);
            
          if (freshData && freshData.length > 0) {
            console.log(`📊 Retrieved ${freshData.length} fresh records`);
            return freshData;
          }
        }
      } catch (error) {
        console.error('❌ Error triggering market data fetch:', error);
      }
      
      // Final fallback - get ANY recent data
      const { data: fallbackData } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at, timestamp')
        .order('created_at', { ascending: false })
        .limit(100);
        
      console.log(`📊 Fallback found ${fallbackData?.length || 0} total records`);
      return fallbackData || [];
      
    } catch (error) {
      console.error('❌ Error checking market data:', error);
      return [];
    }
  };

  const fetchSignals = useCallback(async () => {
    try {
      console.log('🔄 Fetching trading signals...');
      
      const { data: activeSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) {
        console.error('❌ Error fetching signals:', error);
        setSignals([]);
        return;
      }

      if (!activeSignals || activeSignals.length === 0) {
        console.log('📭 No active signals found');
        
        // Try to generate signals if none exist
        try {
          console.log('🚀 Triggering signal generation...');
          const { data: generateResult } = await supabase.functions.invoke('generate-signals');
          console.log('✅ Signal generation result:', generateResult);
          
          // Wait and try to fetch again
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: newSignals } = await supabase
            .from('trading_signals')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(25);
            
          if (newSignals && newSignals.length > 0) {
            console.log(`📊 Found ${newSignals.length} new signals after generation`);
            // Process these new signals with the existing logic below
            const processedSignals = await processSignals(newSignals);
            setSignals(processedSignals);
            setLastUpdate(new Date().toLocaleTimeString());
            return;
          }
        } catch (error) {
          console.error('❌ Error generating signals:', error);
        }
        
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
        return;
      }

      const processedSignals = await processSignals(activeSignals);
      setSignals(processedSignals);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (processedSignals.length > 0) {
        toast({
          title: "Signals Updated",
          description: `${processedSignals.length} trading signals loaded`,
        });
      }
      
    } catch (error) {
      console.error('❌ Error in fetchSignals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const processSignals = async (activeSignals: any[]) => {
    console.log(`📊 Found ${activeSignals.length} active signals`);
    
    // Extract unique symbols and validate them
    const symbols = [...new Set(activeSignals
      .filter(signal => signal?.symbol && typeof signal.symbol === 'string')
      .map(signal => signal.symbol))];
      
    console.log('🔍 Getting market data for symbols:', symbols);
    
    const marketData = await ensureMarketDataAvailable(symbols);
    
    // Group market data by symbol, getting the latest for each
    const marketDataBySymbol = marketData.reduce((acc, item) => {
      if (item?.symbol && item?.price && !acc[item.symbol] || 
          (acc[item.symbol] && new Date(item.created_at) > new Date(acc[item.symbol].created_at))) {
        acc[item.symbol] = item;
      }
      return acc;
    }, {} as Record<string, any>);

    console.log(`📊 Market data available for symbols: [${Object.keys(marketDataBySymbol).join(', ')}]`);

    // Process all signals with proper validation and fallbacks
    const transformedSignals = activeSignals
      .map(signal => {
        try {
          // Validate required fields
          if (!signal?.id || !signal?.symbol || !signal?.type) {
            console.warn('❌ Invalid signal data:', signal);
            return null;
          }

          const latestMarketData = marketDataBySymbol[signal.symbol];
          let currentMarketPrice;
          
          if (latestMarketData && latestMarketData.price) {
            currentMarketPrice = parseFloat(latestMarketData.price.toString());
            console.log(`📈 Using real price for ${signal.symbol}: ${currentMarketPrice}`);
          } else {
            // Use signal price as fallback
            currentMarketPrice = parseFloat(signal.price?.toString() || '1.0');
            console.log(`📊 Using signal price for ${signal.symbol}: ${currentMarketPrice}`);
          }
          
          // Validate the calculated price
          if (!currentMarketPrice || isNaN(currentMarketPrice) || currentMarketPrice <= 0) {
            console.warn(`❌ Invalid price for ${signal.symbol}: ${currentMarketPrice}`);
            return null;
          }
          
          // Create chart data with realistic variation
          const chartData = Array.from({ length: 30 }, (_, i) => ({
            time: i,
            price: currentMarketPrice * (1 + (Math.random() - 0.5) * 0.002)
          }));

          // Safe parsing of take profits array
          let takeProfits = [];
          if (signal.take_profits && Array.isArray(signal.take_profits)) {
            takeProfits = signal.take_profits.map(tp => parseFloat(tp?.toString() || '0'));
          }

          return {
            id: signal.id,
            pair: signal.symbol,
            type: signal.type || 'BUY',
            entryPrice: currentMarketPrice.toFixed(5),
            stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
            takeProfit1: takeProfits[0] ? takeProfits[0].toFixed(5) : '0.00000',
            takeProfit2: takeProfits[1] ? takeProfits[1].toFixed(5) : '0.00000',
            takeProfit3: takeProfits[2] ? takeProfits[2].toFixed(5) : '0.00000',
            confidence: Math.floor(signal.confidence || 87),
            timestamp: signal.created_at || new Date().toISOString(),
            status: signal.status || 'active',
            analysisText: signal.analysis_text || `AI ${signal.type || 'BUY'} signal for ${signal.symbol}`,
            chartData: chartData
          };
        } catch (error) {
          console.error(`❌ Error transforming signal for ${signal?.symbol}:`, error);
          return null;
        }
      })
      .filter(Boolean) as TradingSignal[];

    console.log(`✅ Successfully processed ${transformedSignals.length} signals`);
    return transformedSignals;
  };

  const triggerAutomaticSignalGeneration = useCallback(async () => {
    try {
      console.log('🚀 Triggering comprehensive market update...');
      
      // First ensure fresh market data
      console.log('📡 Fetching fresh market data...');
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketDataError) {
        console.error('❌ Market data update failed:', marketDataError);
        toast({
          title: "Update Failed",
          description: "Failed to fetch latest market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Market data fetched, result:', marketResult);
      
      // Wait for signal generation (which should be triggered automatically by fetch-market-data)
      console.log('⏳ Waiting for signal generation to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Refresh signals
      await fetchSignals();
      
      toast({
        title: "Update Complete",
        description: "Market data and signals have been refreshed",
      });
      
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

    // Automatic refresh every 2 minutes with market data fetch
    const updateInterval = setInterval(async () => {
      console.log('🕒 Scheduled refresh...');
      await triggerAutomaticSignalGeneration();
    }, 2 * 60 * 1000);

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(marketChannel);
      clearInterval(updateInterval);
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
