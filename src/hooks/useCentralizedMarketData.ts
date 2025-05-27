
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const channelsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchCentralizedData = useCallback(async (isRetry = false) => {
    if (!symbol || !mountedRef.current || !SUPPORTED_PAIRS.includes(symbol)) {
      return;
    }

    try {
      console.log(`🔄 Fetching centralized data for ${symbol}${isRetry ? ' (retry)' : ''}`);

      // Get current FastForex-powered market state with immediate response
      const { data: marketState, error: stateError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stateError) {
        console.error(`❌ Error fetching FastForex market state for ${symbol}:`, stateError);
        if (!isRetry) {
          // Retry once after a short delay
          retryTimeoutRef.current = setTimeout(() => fetchCentralizedData(true), 1000);
        }
        return;
      }

      // Get recent price history with more aggressive caching
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('price, timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(150); // More points for smoother charts

      if (historyError) {
        console.warn(`⚠️ Error fetching price history for ${symbol}:`, historyError);
        // Continue with just market state if history fails
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history with better error handling
        const chartData: PriceData[] = Array.isArray(priceHistory) && priceHistory.length > 0
          ? priceHistory
              .reverse()
              .map((item, index) => {
                try {
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
                    volume: Math.random() * 150000 + 80000
                  };
                } catch (error) {
                  console.warn(`Warning: Invalid price history item for ${symbol}:`, item);
                  return null;
                }
              })
              .filter(Boolean) as PriceData[]
          : [];

        // If no chart data, create a single point with current price
        if (chartData.length === 0 && marketState.current_price) {
          const now = Date.now();
          chartData.push({
            timestamp: now,
            time: new Date(now).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            price: parseFloat(marketState.current_price.toString()),
            volume: 100000
          });
          console.log(`📊 Created fallback chart data for ${symbol}`);
        }

        // Enhanced change calculation
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

        // Determine data source description
        let sourceDescription = 'FastForex Live';
        if (marketState.source?.includes('fresh')) {
          sourceDescription = 'FastForex Fresh';
        } else if (marketState.source?.includes('tick')) {
          sourceDescription = 'FastForex Tick';
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
        setIsInitialLoad(false);
        
        console.log(`✅ FastForex data loaded for ${symbol}: ${chartData.length} price points, current: ${centralizedData.currentPrice}`);
      }

    } catch (error) {
      console.error(`❌ Error in fetchCentralizedData for ${symbol}:`, error);
      if (mountedRef.current) {
        setIsConnected(false);
        if (!isRetry) {
          // Retry once after error
          retryTimeoutRef.current = setTimeout(() => fetchCentralizedData(true), 2000);
        }
      }
    }
  }, [symbol]);

  // Enhanced real-time subscriptions with immediate data fetch
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      return;
    }

    mountedRef.current = true;
    
    // Immediate data fetch on mount
    fetchCentralizedData();

    // Clear existing channels safely
    if (channelsRef.current && Array.isArray(channelsRef.current)) {
      channelsRef.current.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Error removing channel:', error);
        }
      });
    }
    channelsRef.current = [];

    // Real-time subscription with faster updates
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
          console.log(`🔔 Real-time FastForex state update for ${symbol}`);
          // Immediate update for real-time feel
          setTimeout(fetchCentralizedData, 10);
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
          // Auto-retry connection
          setTimeout(() => {
            if (mountedRef.current) {
              fetchCentralizedData();
            }
          }, 3000);
        }
      });

    // Real-time subscription for price history updates with faster response
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
          console.log(`📈 Real-time FastForex price tick for ${symbol}`);
          // Very quick update for smooth real-time charting
          setTimeout(fetchCentralizedData, 5);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        console.log(`📊 FastForex history channel ${symbol}: ${status}`);
      });

    channelsRef.current = [stateChannel, historyChannel];

    // Connection health monitoring with auto-recovery
    const healthCheck = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Check data freshness
      if (marketData?.lastUpdate) {
        const now = new Date();
        const lastUpdateParts = marketData.lastUpdate.split(':').map(Number);
        const lastUpdateTime = new Date();
        lastUpdateTime.setHours(lastUpdateParts[0], lastUpdateParts[1], lastUpdateParts[2]);
        
        const timeDiff = now.getTime() - lastUpdateTime.getTime();
        
        // If no updates for more than 90 seconds, refresh
        if (timeDiff > 90000) {
          console.log(`⚠️ Stale data for ${symbol}, refreshing...`);
          fetchCentralizedData();
        }
      } else if (!isInitialLoad) {
        // If no data at all after initial load, try to fetch
        console.log(`⚠️ No data for ${symbol}, attempting refresh...`);
        fetchCentralizedData();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelsRef.current && Array.isArray(channelsRef.current)) {
        channelsRef.current.forEach(channel => {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn('Error removing channel:', error);
          }
        });
      }
      channelsRef.current = [];
      clearInterval(healthCheck);
    };
  }, [symbol, fetchCentralizedData, marketData?.lastUpdate, isInitialLoad]);

  // Enhanced market update trigger with better error handling
  const triggerMarketUpdate = useCallback(async () => {
    try {
      console.log(`🚀 Triggering FastForex update for ${symbol}...`);
      
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ FastForex stream update failed:', error);
      } else {
        console.log('✅ FastForex stream updated:', data);
        // Allow time for data to propagate, then fetch
        setTimeout(fetchCentralizedData, 500);
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
    refetch: fetchCentralizedData,
    isInitialLoad
  };
};
