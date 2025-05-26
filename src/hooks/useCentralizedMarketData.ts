
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

      // Get recent price history (last 100 points for charts)
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (historyError) {
        console.error(`❌ Error fetching price history for ${symbol}:`, historyError);
        return;
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history for charts
        const chartData: PriceData[] = (priceHistory || [])
          .reverse()
          .map((item) => ({
            timestamp: new Date(item.timestamp).getTime(),
            time: new Date(item.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            price: parseFloat(item.price.toString()),
            volume: Math.random() * 100000 + 50000
          }));

        // Calculate change using recent price data
        let change24h = 0;
        let changePercentage = 0;
        
        if (chartData.length >= 2) {
          const currentPrice = chartData[chartData.length - 1].price;
          const oldPrice = chartData[0].price;
          change24h = currentPrice - oldPrice;
          changePercentage = (change24h / oldPrice) * 100;
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
        setDataSource(`Live ${marketState.source?.includes('tick') ? 'Ticks' : 'Data'}`);
      }

    } catch (error) {
      console.error(`❌ Error in fetchCentralizedData for ${symbol}:`, error);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [symbol]);

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      return;
    }

    mountedRef.current = true;
    fetchCentralizedData();

    // Subscribe to market state changes for instant price updates
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
          console.log(`🔔 Live update for ${symbol}:`, payload.new);
          // Immediate fetch for latest data
          fetchCentralizedData();
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        setIsConnected(status === 'SUBSCRIBED');
        console.log(`📡 Live channel ${symbol}: ${status}`);
      });

    // Subscribe to price history for chart updates
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
          // Quick fetch for chart update
          fetchCentralizedData();
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

  // Trigger market update if no data exists
  const triggerMarketUpdate = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ Market stream update failed:', error);
      } else {
        console.log('✅ Market stream updated:', data);
        setTimeout(fetchCentralizedData, 500);
      }
    } catch (error) {
      console.error('❌ Error triggering market update:', error);
    }
  }, [fetchCentralizedData]);

  return {
    marketData,
    isConnected,
    dataSource,
    triggerMarketUpdate,
    refetch: fetchCentralizedData
  };
};
