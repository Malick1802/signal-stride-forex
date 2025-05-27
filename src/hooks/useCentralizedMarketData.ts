
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
  const [isLoading, setIsLoading] = useState(true);
  const channelsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  // Immediate data fetch with aggressive retry
  const fetchCentralizedData = useCallback(async (isRetry = false) => {
    if (!symbol || !mountedRef.current || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🚀 [${symbol}] Fetching live data${isRetry ? ' (retry)' : ''}`);

      // Get current FastForex-powered market state
      const { data: marketState, error: stateError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stateError) {
        console.error(`❌ [${symbol}] Market state error:`, stateError);
        if (!isRetry && mountedRef.current) {
          // Immediate retry for initial loads
          retryTimeoutRef.current = setTimeout(() => fetchCentralizedData(true), 500);
        }
        return;
      }

      // Get recent price history
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('price, timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(200); // More points for smoother charts

      if (historyError) {
        console.warn(`⚠️ [${symbol}] Price history warning:`, historyError);
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history with immediate updates
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
                  console.warn(`⚠️ [${symbol}] Invalid price history item:`, item);
                  return null;
                }
              })
              .filter(Boolean) as PriceData[]
          : [];

        // Always ensure we have current price data
        const currentPrice = parseFloat(marketState.current_price.toString());
        if (chartData.length === 0 && currentPrice) {
          const now = Date.now();
          chartData.push({
            timestamp: now,
            time: new Date(now).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            price: currentPrice,
            volume: 100000
          });
          console.log(`📊 [${symbol}] Created live fallback data point`);
        }

        // Enhanced change calculation
        let change24h = 0;
        let changePercentage = 0;
        
        if (chartData.length >= 2) {
          const newPrice = chartData[chartData.length - 1].price;
          const oldPrice = chartData[0].price;
          
          if (oldPrice > 0) {
            change24h = newPrice - oldPrice;
            changePercentage = (change24h / oldPrice) * 100;
          }
        }

        const centralizedData: CentralizedMarketData = {
          symbol: marketState.symbol,
          currentPrice,
          bid: parseFloat(marketState.bid?.toString() || '0'),
          ask: parseFloat(marketState.ask?.toString() || '0'),
          lastUpdate: new Date(marketState.last_update).toLocaleTimeString(),
          isMarketOpen: marketState.is_market_open || false,
          priceHistory: chartData,
          change24h,
          changePercentage
        };

        // Update state immediately
        setMarketData(centralizedData);
        setIsConnected(true);
        setDataSource('FastForex Live');
        setIsInitialLoad(false);
        setIsLoading(false);
        lastUpdateRef.current = Date.now();
        
        console.log(`✅ [${symbol}] Live data updated: ${chartData.length} points, price: ${currentPrice}`);
      }

    } catch (error) {
      console.error(`❌ [${symbol}] Fetch error:`, error);
      if (mountedRef.current) {
        setIsConnected(false);
        if (!isRetry) {
          retryTimeoutRef.current = setTimeout(() => fetchCentralizedData(true), 1000);
        }
      }
    }
  }, [symbol]);

  // Enhanced real-time subscriptions with immediate updates
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    mountedRef.current = true;
    setIsLoading(true);
    
    // Immediate data fetch on mount
    fetchCentralizedData();

    // Clear existing channels
    if (channelsRef.current && Array.isArray(channelsRef.current)) {
      channelsRef.current.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('[Channel Cleanup] Error:', error);
        }
      });
    }
    channelsRef.current = [];

    // Real-time subscription for market state with immediate response
    const stateChannel = supabase
      .channel(`live-state-${symbol}-${Date.now()}`)
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
          console.log(`🔔 [${symbol}] Real-time state update received`);
          // Immediate fetch for real-time feel
          setTimeout(() => {
            if (mountedRef.current) {
              fetchCentralizedData();
            }
          }, 50);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        console.log(`📡 [${symbol}] State channel: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          console.error(`❌ [${symbol}] State subscription failed: ${status}`);
        }
      });

    // Real-time subscription for price ticks with ultra-fast response
    const historyChannel = supabase
      .channel(`live-ticks-${symbol}-${Date.now()}`)
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
          console.log(`📈 [${symbol}] Real-time price tick received`);
          // Ultra-fast update for smooth charting
          setTimeout(() => {
            if (mountedRef.current) {
              fetchCentralizedData();
            }
          }, 10);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        console.log(`📊 [${symbol}] Tick channel: ${status}`);
      });

    channelsRef.current = [stateChannel, historyChannel];

    // Enhanced connection monitoring with auto-recovery
    const healthCheck = setInterval(() => {
      if (!mountedRef.current) return;
      
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdateRef.current;
      
      // If no updates for 2 minutes, force refresh
      if (timeSinceUpdate > 120000) {
        console.log(`⚠️ [${symbol}] Stale data detected, forcing refresh...`);
        fetchCentralizedData();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      setIsLoading(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelsRef.current && Array.isArray(channelsRef.current)) {
        channelsRef.current.forEach(channel => {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn('[Cleanup] Channel removal error:', error);
          }
        });
      }
      channelsRef.current = [];
      clearInterval(healthCheck);
    };
  }, [symbol, fetchCentralizedData]);

  // Enhanced market update trigger
  const triggerMarketUpdate = useCallback(async () => {
    try {
      console.log(`🚀 [${symbol}] Triggering market update...`);
      
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error(`❌ [${symbol}] Market update failed:`, error);
      } else {
        console.log(`✅ [${symbol}] Market update triggered:`, data);
        // Quick follow-up fetch
        setTimeout(() => {
          if (mountedRef.current) {
            fetchCentralizedData();
          }
        }, 200);
      }
    } catch (error) {
      console.error(`❌ [${symbol}] Market update error:`, error);
    }
  }, [fetchCentralizedData, symbol]);

  return {
    marketData,
    isConnected,
    dataSource,
    triggerMarketUpdate,
    refetch: fetchCentralizedData,
    isInitialLoad,
    isLoading
  };
};
