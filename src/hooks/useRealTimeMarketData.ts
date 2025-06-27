
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCentralizedMarketData } from './useCentralizedMarketData';
import { useGlobalRefresh } from './useGlobalRefresh';
import { checkMarketHours } from '@/utils/marketHours';

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
  
  // Use global refresh state for coordinated updates - but only during market hours
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

  // Enhanced market hours check using centralized utility
  const getMarketStatus = useCallback(() => {
    return checkMarketHours();
  }, []);

  // React to global refresh updates ONLY when market is open
  useEffect(() => {
    const marketStatus = getMarketStatus();
    
    if (shouldUseCentralized && 
        lastPriceUpdate > lastGlobalUpdateRef.current && 
        mountedRef.current && 
        marketStatus.isOpen) {
      console.log(`🔄 [${pair}] Responding to global refresh update (market open)`);
      lastGlobalUpdateRef.current = lastPriceUpdate;
      
      // Fetch fresh data in response to global update
      setTimeout(() => {
        if (mountedRef.current && getMarketStatus().isOpen) {
          refetch();
        }
      }, 100);
    } else if (!marketStatus.isOpen) {
      console.log(`💤 [${pair}] Market closed - ignoring price updates`);
    }
  }, [lastPriceUpdate, pair, shouldUseCentralized, refetch, getMarketStatus]);

  // Enhanced auto-trigger for initial load - only during market hours
  useEffect(() => {
    mountedRef.current = true;
    
    const marketStatus = getMarketStatus();
    
    if (shouldUseCentralized && isInitialLoad && !marketData && !isLoading && marketStatus.isOpen) {
      console.log(`🚀 [${pair}] Auto-triggering initial data fetch (market open)`);
      const timer = setTimeout(() => {
        if (mountedRef.current && !marketData && getMarketStatus().isOpen) {
          triggerMarketUpdate();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [pair, shouldUseCentralized, marketData, triggerMarketUpdate, isInitialLoad, isLoading, getMarketStatus]);

  // Track data updates for freshness - only during market hours
  useEffect(() => {
    const marketStatus = getMarketStatus();
    if (marketData && marketData.priceHistory.length > 0 && marketStatus.isOpen) {
      setLastDataUpdate(Date.now());
    }
  }, [marketData, getMarketStatus]);

  const getPriceChange = useCallback(() => {
    const marketStatus = getMarketStatus();
    
    if (shouldUseCentralized && marketData && marketStatus.isOpen) {
      return {
        change: marketData.change24h,
        percentage: marketData.changePercentage
      };
    }
    
    // During market closure, return zero change
    return { change: 0, percentage: 0 };
  }, [shouldUseCentralized, marketData, getMarketStatus]);

  const getSparklineData = useCallback(() => {
    const marketStatus = getMarketStatus();
    if (shouldUseCentralized && marketData && marketStatus.isOpen) {
      return marketData.priceHistory.slice(-20);
    }
    return [];
  }, [shouldUseCentralized, marketData, getMarketStatus]);

  // Enhanced return for centralized data with market closure handling
  if (shouldUseCentralized) {
    const marketStatus = getMarketStatus();
    const hasData = marketData && marketData.priceHistory.length > 0;
    const dataAge = lastDataUpdate > 0 ? Date.now() - lastDataUpdate : 0;
    const isDataFresh = dataAge < 300000; // 5 minutes
    
    // Connection status must consider market hours
    const connectionStatus = isConnected && hasData && !isUpdating && marketStatus.isOpen;
    
    // Enhanced data source with market status
    let enhancedDataSource = dataSource;
    if (!marketStatus.isOpen) {
      enhancedDataSource = `Market Closed - Next Open: ${marketStatus.nextOpenTime?.toLocaleString()}`;
    } else if (!hasData) {
      enhancedDataSource += ' - Loading...';
    } else if (isUpdating) {
      enhancedDataSource += ' - Updating...';
    } else if (!isDataFresh && hasData) {
      enhancedDataSource += ' - Stale';
    }
    
    return {
      priceData: marketData?.priceHistory || [],
      currentPrice: marketData?.currentPrice || null,
      isMarketOpen: marketStatus.isOpen,
      lastUpdateTime: marketData?.lastUpdate || '',
      dataSource: enhancedDataSource,
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
