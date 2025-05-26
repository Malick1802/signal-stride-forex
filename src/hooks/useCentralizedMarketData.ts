
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface CentralizedMarketData {
  symbol: string;
  currentPrice: number;
  bid: number;
  ask: number;
  lastUpdate: string;
  isMarketOpen: boolean;
  priceHistory: PriceData[];
  change24h: number;
  changePercentage: number;
}

// Expanded supported pairs for full centralization
const SUPPORTED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
  'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
  'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY'
];

export const useCentralizedMarketData = (symbol: string) => {
  const [marketData, setMarketData] = useState<CentralizedMarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<string>('Centralized Real-time');
  const channelRef = useRef<any>();
  const mountedRef = useRef(true);

  const fetchCentralizedData = useCallback(async () => {
    if (!symbol || !mountedRef.current || !SUPPORTED_PAIRS.includes(symbol)) {
      return;
    }

    try {
      // Get current market state
      const { data: marketState, error: stateError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stateError) {
        console.error(`❌ Error fetching market state for ${symbol}:`, stateError);
        return;
      }

      // Get recent price history (last 100 points for charts) with optimized query
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('price, timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (historyError) {
        console.error(`❌ Error fetching price history for ${symbol}:`, historyError);
        return;
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history for charts with enhanced time formatting
        const chartData: PriceData[] = (priceHistory || [])
          .reverse()
          .map((item, index) => {
            const itemTime = new Date(item.timestamp);
            return {
              timestamp: itemTime.getTime(),
              time: itemTime.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              price: parseFloat(item.price.toString()),
              volume: Math.random() * 100000 + 50000 // Simulated volume
            };
          });

        // Enhanced change calculation with better error handling
        let change24h = 0;
        let changePercentage = 0;
        
        if (chartData.length >= 2) {
          const currentPrice = chartData[chartData.length - 1].price;
          const oldPrice = chartData[0].price;
          
          if (oldPrice > 0) {
            change24h = currentPrice - oldPrice;
            changePercentage = (change24h / oldPrice) * 100;
          }
        }

        // Determine data source based on the actual source field
        let sourceDescription = 'Live Data';
        if (marketState.source?.includes('enhanced')) {
          sourceDescription = 'Enhanced Live';
        } else if (marketState.source?.includes('tick')) {
          sourceDescription = 'Real-time Ticks';
        } else if (marketState.source?.includes('weekend')) {
          sourceDescription = 'Weekend Sim';
        }

        const centralizedData: CentralizedMarketData = {
          symbol: marketState.symbol,
          currentPrice: parseFloat(marketState.current_price.toString()),
          bid: parseFloat(marketState.bid?.toString() || '0'),
          ask: parseFloat(marketState.ask?.toString() || '0'),
          lastUpdate: new Date(marketState.last_update).toLocaleTimeString(),
          isMarketOpen: marketState.is_market_open || false,
          priceHistory: chartData,
          change24h,
          changePercentage
        };

        setMarketData(centralizedData);
        setIsConnected(true);
        setDataSource(sourceDescription);
      }

    } catch (error) {
      console.error(`❌ Error in fetchCentralizedData for ${symbol}:`, error);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [symbol]);

  // Set up optimized real-time subscriptions
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      return;
    }

    mountedRef.current = true;
    fetchCentralizedData();

    // Enhanced real-time subscription with immediate updates
    const stateChannel = supabase
      .channel(`live-market-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'centralized_market_state',
          filter: `symbol=eq.${symbol}`
        },
        (payload) => {
          if (!mountedRef.current) return;
          console.log(`🔔 Real-time update for ${symbol}:`, payload.new);
          // Immediate fetch for latest data with slight delay to ensure DB consistency
          setTimeout(fetchCentralizedData, 100);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        setIsConnected(status === 'SUBSCRIBED');
        console.log(`📡 Live channel ${symbol}: ${status}`);
      });

    // Optimized price history subscription (only for new inserts)
    const historyChannel = supabase
      .channel(`live-history-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_price_history',
          filter: `symbol=eq.${symbol}`
        },
        (payload) => {
          if (!mountedRef.current) return;
          console.log(`📈 New tick for ${symbol}:`, payload.new);
          // Quick update for chart data
          setTimeout(fetchCentralizedData, 50);
        }
      )
      .subscribe();

    channelRef.current = { stateChannel, historyChannel };

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.stateChannel);
        supabase.removeChannel(channelRef.current.historyChannel);
        channelRef.current = null;
      }
    };
  }, [symbol, fetchCentralizedData]);

  // Enhanced market update trigger
  const triggerMarketUpdate = useCallback(async () => {
    try {
      console.log(`🚀 Triggering market update for ${symbol}...`);
      
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ Market stream update failed:', error);
      } else {
        console.log('✅ Market stream updated:', data);
        // Longer delay to ensure all updates propagate
        setTimeout(fetchCentralizedData, 1000);
      }
    } catch (error) {
      console.error('❌ Error triggering market update:', error);
    }
  }, [fetchCentralizedData, symbol]);

  return {
    marketData,
    isConnected,
    dataSource,
    triggerMarketUpdate,
    refetch: fetchCentralizedData
  };
};
