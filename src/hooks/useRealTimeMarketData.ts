import { useState, useEffect, useRef, useCallback } from 'react';
import { useBatchedMarketData } from './useBatchedMarketData';

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
  
  // Use batched data instead of individual requests
  const { marketData, isLoading, lastBatchUpdate, refetch } = useBatchedMarketData(
    shouldUseCentralized ? [pair] : []
  );
  
  const mountedRef = useRef(true);
  const [lastDataUpdate, setLastDataUpdate] = useState<number>(0);

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

  // Track data updates for freshness
  useEffect(() => {
    if (marketData[pair]) {
      setLastDataUpdate(Date.now());
    }
  }, [marketData, pair]);

  const getPriceChange = useCallback(() => {
    if (shouldUseCentralized && marketData[pair]) {
      const history = marketData[pair].priceHistory;
      if (history.length < 2) return { change: 0, percentage: 0 };
      
      const current = history[0]?.price || 0;
      const previous = history[history.length - 1]?.price || 0;
      const change = current - previous;
      const percentage = previous > 0 ? (change / previous) * 100 : 0;
      
      return { change, percentage };
    }
    
    return { change: 0, percentage: 0 };
  }, [shouldUseCentralized, marketData, pair]);

  const getSparklineData = useCallback(() => {
    if (shouldUseCentralized && marketData[pair]) {
      return marketData[pair].priceHistory.slice(-20);
    }
    return [];
  }, [shouldUseCentralized, marketData, pair]);

  // Enhanced return for centralized data with emergency fixes
  if (shouldUseCentralized) {
    const pairData = marketData[pair];
    const hasData = pairData && pairData.priceHistory.length > 0;
    const dataAge = lastDataUpdate > 0 ? Date.now() - lastDataUpdate : 0;
    const isDataFresh = dataAge < 300000; // 5 minutes
    
    // Simplified connection status
    const connectionStatus = hasData && !isLoading;
    
    return {
      priceData: pairData?.priceHistory || [],
      currentPrice: pairData?.currentPrice || null,
      isMarketOpen: pairData?.isMarketOpen ?? checkMarketHours(),
      lastUpdateTime: lastBatchUpdate,
      dataSource: `Batched (${lastBatchUpdate})`,
      isConnected: connectionStatus && isDataFresh,
      getPriceChange,
      getSparklineData,
      isLoading: isLoading
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
