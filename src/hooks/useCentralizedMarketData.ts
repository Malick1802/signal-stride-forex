
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

// Supported pairs that are available in the centralized market stream
const SUPPORTED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
];

export const useCentralizedMarketData = (symbol: string) => {
  const [marketData, setMarketData] = useState<CentralizedMarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<string>('Real-time Centralized');
  const channelRef = useRef<any>();
  const mountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);

  const fetchCentralizedData = useCallback(async () => {
    if (!symbol || !mountedRef.current || !SUPPORTED_PAIRS.includes(symbol)) {
      return;
    }

    // Reduce debouncing for more responsive updates
    const now = Date.now();
    if (now - lastFetchRef.current < 100) {
      return;
    }
    lastFetchRef.current = now;

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

      // Get price history (last 50 points for smoother charts)
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (historyError) {
        console.error(`❌ Error fetching price history for ${symbol}:`, historyError);
        return;
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history for charts
        const chartData: PriceData[] = (priceHistory || [])
          .reverse()
          .map((item, index) => ({
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

        // Calculate change (compare with oldest price in history)
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
        setDataSource(`Real-time ${marketState.source === 'real-time-tick' ? 'Live Ticks' : 'Centralized'}`);
      }

    } catch (error) {
      console.error(`❌ Error in fetchCentralizedData for ${symbol}:`, error);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [symbol]);

  // Set up real-time subscriptions with high-frequency updates
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      return;
    }

    mountedRef.current = true;
    fetchCentralizedData();

    // Subscribe to market state changes - very aggressive real-time updates
    const stateChannel = supabase
      .channel(`real-time-market-${symbol}`)
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
          console.log(`🔔 Real-time tick update for ${symbol}`);
          // Immediate fetch for tick updates
          setTimeout(fetchCentralizedData, 50);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        setIsConnected(status === 'SUBSCRIBED');
        console.log(`📡 Real-time channel ${symbol}: ${status}`);
      });

    // Subscribe to price history updates - for chart updates
    const historyChannel = supabase
      .channel(`real-time-history-${symbol}`)
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
          console.log(`📈 New tick data for ${symbol}`);
          // Quick fetch for new tick data
          setTimeout(fetchCentralizedData, 100);
        }
      )
      .subscribe();

    channelRef.current = { stateChannel, historyChannel };

    // High-frequency refresh for real-time feel
    const refreshInterval = setInterval(() => {
      if (mountedRef.current) {
        fetchCentralizedData();
      }
    }, 1000); // Every 1 second

    return () => {
      mountedRef.current = false;
      clearInterval(refreshInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.stateChannel);
        supabase.removeChannel(channelRef.current.historyChannel);
        channelRef.current = null;
      }
    };
  }, [symbol, fetchCentralizedData]);

  // Trigger tick generator
  const triggerTickGenerator = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('real-time-tick-generator');
      
      if (error) {
        console.error('❌ Tick generator failed:', error);
      } else {
        console.log('✅ Tick generator triggered:', data);
        // Wait a bit then fetch fresh data
        setTimeout(fetchCentralizedData, 500);
      }
    } catch (error) {
      console.error('❌ Error triggering tick generator:', error);
    }
  }, [fetchCentralizedData]);

  // Trigger market update (now includes tick generation)
  const triggerMarketUpdate = useCallback(async () => {
    try {
      // First update baseline data
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ Market stream update failed:', error);
      } else {
        console.log('✅ Market stream update triggered:', data);
        // Then trigger tick generator
        setTimeout(triggerTickGenerator, 1000);
      }
    } catch (error) {
      console.error('❌ Error triggering market update:', error);
    }
  }, [triggerTickGenerator]);

  return {
    marketData,
    isConnected,
    dataSource,
    triggerMarketUpdate,
    triggerTickGenerator,
    refetch: fetchCentralizedData
  };
};
