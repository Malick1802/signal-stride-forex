
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCentralizedMarketData } from './useCentralizedMarketData';

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
  
  const { marketData, isConnected, dataSource, triggerMarketUpdate, isInitialLoad } = useCentralizedMarketData(
    shouldUseCentralized ? pair : ''
  );
  
  const mountedRef = useRef(true);

  // Check market hours
  const checkMarketHours = useCallback(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
  }, []);

  // Auto-trigger updates if no data on first load
  useEffect(() => {
    mountedRef.current = true;
    
    if (shouldUseCentralized && isInitialLoad && !marketData) {
      console.log(`🔄 Auto-triggering data fetch for ${pair} on first load`);
      const timer = setTimeout(() => {
        if (mountedRef.current && !marketData) {
          triggerMarketUpdate();
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [pair, shouldUseCentralized, marketData, triggerMarketUpdate, isInitialLoad]);

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

  // Return centralized data with better status indicators
  if (shouldUseCentralized) {
    const hasData = marketData && marketData.priceHistory.length > 0;
    const connectionStatus = isConnected && hasData;
    
    return {
      priceData: marketData?.priceHistory || [],
      currentPrice: marketData?.currentPrice || null,
      isMarketOpen: marketData?.isMarketOpen ?? checkMarketHours(),
      lastUpdateTime: marketData?.lastUpdate || '',
      dataSource: `${dataSource} (Centralized)${hasData ? '' : ' - Loading...'}`,
      isConnected: connectionStatus,
      getPriceChange,
      getSparklineData
    };
  }

  // For unsupported pairs, return empty state
  return {
    priceData: [],
    currentPrice: null,
    isMarketOpen: false,
    lastUpdateTime: '',
    dataSource: `${pair} not supported`,
    isConnected: false,
    getPriceChange,
    getSparklineData
  };
};
