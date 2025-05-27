
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
  const [dataSource, setDataSource] = useState<string>('FastForex Live');
  const channelsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);

  const fetchCentralizedData = useCallback(async () => {
    if (!symbol || !mountedRef.current || !SUPPORTED_PAIRS.includes(symbol)) {
      return;
    }

    try {
      // Get current FastForex-powered market state
      const { data: marketState, error: stateError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stateError) {
        console.error(`❌ Error fetching FastForex market state for ${symbol}:`, stateError);
        return;
      }

      // Get recent price history optimized for charts
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('price, timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(120); // More points for smoother charts

      if (historyError) {
        console.error(`❌ Error fetching FastForex price history for ${symbol}:`, historyError);
        return;
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history for smooth charting
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
              volume: Math.random() * 150000 + 80000 // Realistic volume simulation
            };
          });

        // Enhanced change calculation with better precision
        let change24h = 0;
        let changePercentage = 0;
        
        if (chartData.length >= 5) {
          const currentPrice = chartData[chartData.length - 1].price;
          const oldPrice = chartData[0].price;
          
          if (oldPrice > 0) {
            change24h = currentPrice - oldPrice;
            changePercentage = (change24h / oldPrice) * 100;
          }
        }

        // Determine FastForex data source type
        let sourceDescription = 'FastForex Live';
        if (marketState.source?.includes('fresh')) {
          sourceDescription = 'FastForex Fresh';
        } else if (marketState.source?.includes('tick')) {
          sourceDescription = 'FastForex Tick';
        } else if (marketState.source?.includes('weekend')) {
          sourceDescription = 'Weekend Sim';
        } else if (marketState.source?.includes('event')) {
          sourceDescription = 'FastForex Event';
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

  // Enhanced real-time subscriptions with better error handling
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      return;
    }

    mountedRef.current = true;
    fetchCentralizedData();

    // Clear existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Enhanced real-time subscription for FastForex market state updates
    const stateChannel = supabase
      .channel(`fastforex-state-${symbol}-${Date.now()}`)
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
          console.log(`🔔 Real-time FastForex state update for ${symbol}:`, payload.new || payload.old);
          // Immediate fetch for real-time updates
          setTimeout(fetchCentralizedData, 50);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        console.log(`📡 FastForex state channel ${symbol}: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          console.error(`❌ FastForex state subscription failed for ${symbol}: ${status}`);
        }
      });

    // Real-time subscription for price history updates
    const historyChannel = supabase
      .channel(`fastforex-history-${symbol}-${Date.now()}`)
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
          console.log(`📈 Real-time FastForex price tick for ${symbol}:`, payload.new);
          // Very quick update for smooth real-time charting
          setTimeout(fetchCentralizedData, 25);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        console.log(`📊 FastForex history channel ${symbol}: ${status}`);
      });

    channelsRef.current = [stateChannel, historyChannel];

    // Connection health monitoring
    const healthCheck = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Verify we're still getting updates
      const lastUpdate = marketData?.lastUpdate;
      if (lastUpdate) {
        const now = new Date();
        const lastUpdateTime = new Date();
        const [hours, minutes, seconds] = lastUpdate.split(':').map(Number);
        lastUpdateTime.setHours(hours, minutes, seconds);
        
        const timeDiff = now.getTime() - lastUpdateTime.getTime();
        
        // If no updates for more than 2 minutes, try to reconnect
        if (timeDiff > 120000) {
          console.log(`⚠️ No updates for ${symbol} in ${timeDiff/1000}s, refreshing...`);
          fetchCentralizedData();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      mountedRef.current = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      clearInterval(healthCheck);
    };
  }, [symbol, fetchCentralizedData, marketData?.lastUpdate]);

  // Enhanced FastForex market update trigger
  const triggerMarketUpdate = useCallback(async () => {
    try {
      console.log(`🚀 Triggering FastForex update for ${symbol}...`);
      
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ FastForex stream update failed:', error);
      } else {
        console.log('✅ FastForex stream updated:', data);
        // Allow time for FastForex data to propagate
        setTimeout(fetchCentralizedData, 1000);
      }
    } catch (error) {
      console.error('❌ Error triggering FastForex update:', error);
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
