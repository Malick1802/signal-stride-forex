
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCentralizedMarketData } from './useCentralizedMarketData';
import { useGlobalRefresh } from './useGlobalRefresh';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface UseRealTimeMarketDataProps {
  pair: string;
  entryPrice: string;
}

// All pairs use centralized data
const CENTRALIZED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
  'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
  'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY'
];

export const useRealTimeMarketData = ({ pair, entryPrice }: UseRealTimeMarketDataProps) => {
  const shouldUseCentralized = CENTRALIZED_PAIRS.includes(pair);
  
  // Use global refresh state for coordinated updates
  const { lastPriceUpdate, isUpdating, isConnected: globalConnected } = useGlobalRefresh();
  
  const { 
    marketData, 
    isConnected, 
    dataSource, 
    triggerMarketUpdate, 
    isInitialLoad, 
    isLoading,
    refetch 
  } = useCentralizedMarketData(shouldUseCentralized ? pair : '');
  
  const mountedRef = useRef(true);
  const [lastDataUpdate, setLastDataUpdate] = useState<number>(0);
  const lastGlobalUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced market hours check
  const checkMarketHours = useCallback(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
  }, []);

  // React to global refresh updates with debouncing
  useEffect(() => {
    if (shouldUseCentralized && lastPriceUpdate > lastGlobalUpdateRef.current && mountedRef.current) {
      console.log(`🔄 [${pair}] Responding to global refresh update`);
      lastGlobalUpdateRef.current = lastPriceUpdate;
      
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce fetch calls
      updateTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          refetch();
        }
      }, 500);
    }
  }, [lastPriceUpdate, pair, shouldUseCentralized, refetch]);

  // Enhanced auto-trigger for initial load with reduced frequency
  useEffect(() => {
    mountedRef.current = true;
    
    if (shouldUseCentralized && isInitialLoad && !marketData && !isLoading) {
      console.log(`🚀 [${pair}] Auto-triggering initial data fetch`);
      const timer = setTimeout(() => {
        if (mountedRef.current && !marketData) {
          triggerMarketUpdate();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }

    return () => {
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [pair, shouldUseCentralized, marketData, triggerMarketUpdate, isInitialLoad, isLoading]);

  // Track data updates for freshness
  useEffect(() => {
    if (marketData && marketData.priceHistory.length > 0) {
      setLastDataUpdate(Date.now());
    }
  }, [marketData]);

  const getPriceChange = useCallback(() => {
    if (shouldUseCentralized && marketData) {
      return {
        change: marketData.change24h,
        percentage: marketData.changePercentage
      };
    }
    
    return { change: 0, percentage: 0 };
  }, [shouldUseCentralized, marketData]);

  const getSparklineData = useCallback(() => {
    if (shouldUseCentralized && marketData) {
      return marketData.priceHistory.slice(-20);
    }
    return [];
  }, [shouldUseCentralized, marketData]);

  // Enhanced return for centralized data with global refresh status
  if (shouldUseCentralized) {
    const hasData = marketData && marketData.priceHistory.length > 0;
    const dataAge = lastDataUpdate > 0 ? Date.now() - lastDataUpdate : 0;
    const isDataFresh = dataAge < 300000; // 5 minutes
    
    // Use global connection status combined with local status
    const connectionStatus = (isConnected || globalConnected) && hasData && !isUpdating;
    
    return {
      priceData: marketData?.priceHistory || [],
      currentPrice: marketData?.currentPrice || null,
      isMarketOpen: marketData?.isMarketOpen ?? checkMarketHours(),
      lastUpdateTime: marketData?.lastUpdate || '',
      dataSource: `${dataSource}${!hasData ? ' - Loading...' : ''}${isUpdating ? ' - Updating...' : ''}${!isDataFresh && hasData ? ' - Stale' : ''}`,
      isConnected: connectionStatus && isDataFresh,
      getPriceChange,
      getSparklineData,
      isLoading: isLoading || isUpdating
    };
  }

  // For unsupported pairs
  return {
    priceData: [],
    currentPrice: null,
    isMarketOpen: false,
    lastUpdateTime: '',
    dataSource: `${pair} not supported`,
    isConnected: false,
    getPriceChange,
    getSparklineData,
    isLoading: false
  };
};
