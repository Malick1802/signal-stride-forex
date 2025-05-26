
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

// Supported pairs for centralized market data
const CENTRALIZED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
];

interface CentralizedMarketData {
  symbol: string;
  current_price: number;
  last_update: string;
}

interface FallbackMarketData {
  symbol: string;
  price: number;
  created_at: string;
  timestamp: string;
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
    try {
      // Check for centralized data first
      const centralizedSymbols = symbols.filter(symbol => CENTRALIZED_PAIRS.includes(symbol));
      
      if (centralizedSymbols.length > 0) {
        const { data: centralizedData, error: centralizedError } = await supabase
          .from('centralized_market_state')
          .select('symbol, current_price, last_update')
          .in('symbol', centralizedSymbols)
          .order('last_update', { ascending: false });

        if (!centralizedError && centralizedData && centralizedData.length > 0) {
          console.log(`📊 Found ${centralizedData.length} centralized pairs`);
          return centralizedData;
        }
      }
      
      // Fallback to live_market_data for other pairs
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at, timestamp')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        console.log(`📈 Found ${fallbackData.length} fallback records`);
        return fallbackData;
      }
      
      // If no data available, trigger fresh fetch
      console.log('🔄 No recent data, triggering fresh market data fetch...');
      
      try {
        const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('centralized-market-stream');
        
        if (!fetchError) {
          console.log('✅ Fresh market data triggered');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { data: freshData } = await supabase
            .from('centralized_market_state')
            .select('symbol, current_price, last_update')
            .order('last_update', { ascending: false })
            .limit(100);
            
          if (freshData && freshData.length > 0) {
            console.log(`📊 Retrieved ${freshData.length} fresh centralized records`);
            return freshData;
          }
        }
      } catch (error) {
        console.error('❌ Error triggering market data fetch:', error);
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Error checking market data:', error);
      return [];
    }
  };

  const fetchSignals = useCallback(async () => {
    try {
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
        
        try {
          const { data: generateResult } = await supabase.functions.invoke('generate-signals');
          console.log('✅ Signal generation result:', generateResult);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: newSignals } = await supabase
            .from('trading_signals')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(25);
            
          if (newSignals && newSignals.length > 0) {
            console.log(`📊 Found ${newSignals.length} new signals after generation`);
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
    console.log(`📊 Processing ${activeSignals.length} active signals`);
    
    const symbols = [...new Set(activeSignals
      .filter(signal => signal?.symbol && typeof signal.symbol === 'string')
      .map(signal => signal.symbol))];
      
    console.log('🔍 Getting market data for symbols:', symbols);
    
    const marketData = await ensureMarketDataAvailable(symbols);
    
    // Group market data by symbol, getting the latest for each
    const marketDataBySymbol = marketData.reduce((acc, item) => {
      if (item?.symbol) {
        // Handle both centralized and fallback data structures
        const isCentralized = 'current_price' in item;
        const isRecent = isCentralized 
          ? (!acc[item.symbol] || new Date(item.last_update) > new Date(acc[item.symbol].timestamp))
          : (!acc[item.symbol] || new Date(item.created_at || item.timestamp) > new Date(acc[item.symbol].timestamp));
        
        if (isRecent) {
          acc[item.symbol] = {
            symbol: item.symbol,
            price: isCentralized ? (item as CentralizedMarketData).current_price : (item as FallbackMarketData).price,
            timestamp: isCentralized ? (item as CentralizedMarketData).last_update : (item as FallbackMarketData).created_at || (item as FallbackMarketData).timestamp
          };
        }
      }
      return acc;
    }, {} as Record<string, { symbol: string; price: number; timestamp: string }>);

    console.log(`📊 Market data available for symbols: [${Object.keys(marketDataBySymbol).join(', ')}]`);

    const transformedSignals = activeSignals
      .map(signal => {
        try {
          if (!signal?.id || !signal?.symbol || !signal?.type) {
            console.warn('❌ Invalid signal data:', signal);
            return null;
          }

          const latestMarketData = marketDataBySymbol[signal.symbol];
          let currentMarketPrice;
          
          if (latestMarketData && latestMarketData.price) {
            currentMarketPrice = parseFloat(latestMarketData.price.toString());
          } else {
            currentMarketPrice = parseFloat(signal.price?.toString() || '1.0');
          }
          
          if (!currentMarketPrice || isNaN(currentMarketPrice) || currentMarketPrice <= 0) {
            console.warn(`❌ Invalid price for ${signal.symbol}: ${currentMarketPrice}`);
            return null;
          }
          
          const chartData = Array.from({ length: 30 }, (_, i) => ({
            time: i,
            price: currentMarketPrice * (1 + (Math.random() - 0.5) * 0.002)
          }));

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
      
      const { data: marketResult, error: marketDataError } = await supabase.functions.invoke('centralized-market-stream');
      
      if (marketDataError) {
        console.error('❌ Market data update failed:', marketDataError);
        toast({
          title: "Update Failed",
          description: "Failed to fetch latest market data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Market data fetched');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    
    // Real-time subscriptions with reduced frequency
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
          setTimeout(fetchSignals, 2000);
        }
      )
      .subscribe();

    // Automatic refresh every 3 minutes
    const updateInterval = setInterval(async () => {
      await triggerAutomaticSignalGeneration();
    }, 3 * 60 * 1000);

    return () => {
      supabase.removeChannel(signalsChannel);
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
