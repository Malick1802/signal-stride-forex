
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkMarketHours, isDataStale, getLastMarketCloseTime } from '@/utils/marketHours';
import { realTimeManager } from '@/hooks/useRealTimeManager';
import { useMarketCoordinator } from '@/hooks/useMarketCoordinator';

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
  const [dataSource, setDataSource] = useState<string>('Live Market Data');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const channelsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  // Use market coordinator for unified synchronization
  const { 
    getMarketData, 
    isConnected: coordinatorConnected, 
    dataVersion,
    forceSync 
  } = useMarketCoordinator();

  // Enhanced market hours check using centralized utility
  const getMarketStatus = useCallback(() => {
    return checkMarketHours();
  }, []);

  // Immediate data fetch with aggressive retry
  const fetchCentralizedData = useCallback(async (isRetry = false) => {
    if (!symbol || !mountedRef.current || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsLoading(false);
      return;
    }

    const marketStatus = getMarketStatus();
    
    // If market is closed, stop all data fetching
    if (!marketStatus.isOpen) {
      console.log(`💤 [${symbol}] Market closed - stopping data fetch`);
      setIsConnected(false);
      setDataSource(`Market Closed - Next Open: ${marketStatus.nextOpenTime?.toLocaleString()}`);
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🚀 [${symbol}] Fetching live data${isRetry ? ' (retry)' : ''} - Market Open`);

      // Get current market state with FastForex metadata
      const { data: marketState, error: stateError } = await supabase
        .from('centralized_market_state')
        .select('*, fastforex_price, fastforex_timestamp, price_change_detected')
        .eq('symbol', symbol)
        .single();

      if (stateError) {
        console.error(`❌ [${symbol}] Market state error:`, stateError);
        if (!isRetry && mountedRef.current && marketStatus.isOpen) {
          retryTimeoutRef.current = setTimeout(() => fetchCentralizedData(true), 500);
        }
        return;
      }

      // Validate FastForex data freshness - reject stale data during market hours
      if (marketState && isDataStale(marketState.last_update, 20)) {
        console.warn(`⚠️ [${symbol}] FastForex data is stale, may be transitioning`);
        setDataSource(`Stale FastForex Data - Last Update: ${new Date(marketState.last_update).toLocaleTimeString()}`);
      } else if (marketState?.fastforex_timestamp) {
        console.log(`✅ [${symbol}] Fresh FastForex data - Updated: ${new Date(marketState.fastforex_timestamp).toLocaleTimeString()}`);
        setDataSource(`Live FastForex Data - Updated: ${new Date(marketState.fastforex_timestamp).toLocaleTimeString()}`);
      }

      // Get recent price history with FastForex metadata
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('price, timestamp, fastforex_price, fastforex_timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(200);

      if (historyError) {
        console.warn(`⚠️ [${symbol}] Price history warning:`, historyError);
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Filter out price history older than last market close
        const lastMarketClose = getLastMarketCloseTime();
        const validPriceHistory = Array.isArray(priceHistory) 
          ? priceHistory.filter(item => new Date(item.timestamp) > lastMarketClose)
          : [];

        // Transform price history with market hours validation
        const chartData: PriceData[] = validPriceHistory
          .reverse()
          .map((item, index) => {
            try {
              const itemTime = new Date(item.timestamp);
              // Only include data from when market was open
              if (itemTime <= lastMarketClose) return null;
              
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
          .filter(Boolean) as PriceData[];

        // Always ensure we have current FastForex price data during market hours
        const currentPrice = parseFloat((marketState.fastforex_price || marketState.current_price).toString());
        if (chartData.length === 0 && currentPrice && marketStatus.isOpen) {
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
          console.log(`📊 [${symbol}] Created FastForex fallback data point: ${currentPrice}`);
        }

        // Enhanced change calculation - only during market hours
        let change24h = 0;
        let changePercentage = 0;
        
        if (chartData.length >= 2 && marketStatus.isOpen) {
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
          lastUpdate: marketState.fastforex_timestamp 
            ? new Date(marketState.fastforex_timestamp).toLocaleTimeString()
            : new Date(marketState.last_update).toLocaleTimeString(),
          isMarketOpen: marketStatus.isOpen,
          priceHistory: chartData,
          change24h,
          changePercentage
        };

        // Update state immediately
        setMarketData(centralizedData);
        const fastforexTimestamp = marketState.fastforex_timestamp || marketState.last_update;
        setIsConnected(marketStatus.isOpen && !isDataStale(fastforexTimestamp, 20));
        setDataSource(marketStatus.isOpen ? 
          `Direct FastForex Data - ${marketStatus.name}${marketState.price_change_detected ? ' [UPDATED]' : ''}` : 
          'Market Closed'
        );
        setIsInitialLoad(false);
        setIsLoading(false);
        lastUpdateRef.current = Date.now();
        
        console.log(`✅ [${symbol}] FastForex data updated: ${chartData.length} points, price: ${currentPrice}, change detected: ${marketState.price_change_detected}`);
      }

    } catch (error) {
      console.error(`❌ [${symbol}] Fetch error:`, error);
      if (mountedRef.current && marketStatus.isOpen) {
        setIsConnected(false);
        if (!isRetry) {
          retryTimeoutRef.current = setTimeout(() => fetchCentralizedData(true), 1000);
        }
      }
    }
  }, [symbol, getMarketStatus]);

  // Enhanced real-time subscriptions with market hours validation
  useEffect(() => {
    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    mountedRef.current = true;
    setIsLoading(true);
    
    const marketStatus = getMarketStatus();
    
    // If market is closed, don't set up subscriptions
    if (!marketStatus.isOpen) {
      console.log(`💤 [${symbol}] Market closed - skipping subscriptions`);
      setIsConnected(false);
      setDataSource(`Market Closed - Next Open: ${marketStatus.nextOpenTime?.toLocaleString()}`);
      setIsLoading(false);
      return;
    }
    
    // Initial data fetch only during market hours
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

    // Use coordinated real-time subscriptions through centralized manager
    if (marketStatus.isOpen) {
      const unsubscribe = realTimeManager.subscribe('market-coordinated-' + symbol, (event) => {
        if (event.type === 'market_data_update' && event.data.symbol === symbol && event.data.synchronized) {
          if (!mountedRef.current) return;
          
          console.log(`🎯 [${symbol}] Coordinated update received`);
          
          // Use coordinator first, then fallback to direct updates
          const coordinatedData = getMarketData(symbol);
          if (coordinatedData) {
            setMarketData(prev => prev ? {
              ...prev,
              currentPrice: coordinatedData.price,
              bid: coordinatedData.bid,
              ask: coordinatedData.ask,
              lastUpdate: new Date(coordinatedData.timestamp).toLocaleTimeString()
            } : null);
            setIsConnected(true);
            setDataSource('Centralized Coordination');
            lastUpdateRef.current = Date.now();
          }
        }
      });

      // Store unsubscribe function
      channelsRef.current = [{ remove: unsubscribe }];
    }

    // Optimized connection monitoring with reduced frequency
    const healthCheck = setInterval(() => {
      if (!mountedRef.current) return;
      
      const currentMarketStatus = getMarketStatus();
      
      // If market closed, update UI accordingly
      if (!currentMarketStatus.isOpen) {
        setIsConnected(false);
        setDataSource(`Market Closed - Next Open: ${currentMarketStatus.nextOpenTime?.toLocaleString()}`);
        return;
      }
      
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdateRef.current;
      
      // Fallback refresh every 2 minutes if no real-time updates
      if (timeSinceUpdate > 120000) {
        console.log(`⚠️ [${symbol}] Fallback refresh - no real-time updates received`);
        fetchCentralizedData();
      }
    }, 120000); // Fallback check every 2 minutes

    return () => {
      mountedRef.current = false;
      setIsLoading(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelsRef.current && Array.isArray(channelsRef.current)) {
        channelsRef.current.forEach(item => {
          try {
            if (item.remove) {
              // Real-time manager subscription
              item.remove();
            } else {
              // Legacy supabase channel
              supabase.removeChannel(item);
            }
          } catch (error) {
            console.warn('[Cleanup] Channel removal error:', error);
          }
        });
      }
      channelsRef.current = [];
      clearInterval(healthCheck);
    };
  }, [symbol, fetchCentralizedData, getMarketStatus]);

  // Enhanced market update trigger with market hours check
  const triggerMarketUpdate = useCallback(async () => {
    const marketStatus = getMarketStatus();
    
    if (!marketStatus.isOpen) {
      console.log(`💤 [${symbol}] Market closed - skipping update trigger`);
      return;
    }

    try {
      console.log(`🚀 [${symbol}] Triggering FastForex market update...`);
      
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error(`❌ [${symbol}] Market update failed:`, error);
      } else {
        console.log(`✅ [${symbol}] Market update triggered:`, data);
        setTimeout(() => {
          if (mountedRef.current && getMarketStatus().isOpen) {
            fetchCentralizedData();
          }
        }, 200);
      }
    } catch (error) {
      console.error(`❌ [${symbol}] Market update error:`, error);
    }
  }, [fetchCentralizedData, symbol, getMarketStatus]);

  return {
    marketData,
    isConnected: isConnected && getMarketStatus().isOpen,
    dataSource,
    triggerMarketUpdate,
    refetch: fetchCentralizedData,
    isInitialLoad,
    isLoading
  };
};
