
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

// All pairs now use centralized data - no client-side fallbacks
const CENTRALIZED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
  // Expanded to include more pairs for full centralization
  'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
  'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY'
];

export const useRealTimeMarketData = ({ pair, entryPrice }: UseRealTimeMarketDataProps) => {
  // All pairs now use centralized data
  const shouldUseCentralized = CENTRALIZED_PAIRS.includes(pair);
  
  const { marketData, isConnected, dataSource, triggerMarketUpdate } = useCentralizedMarketData(
    shouldUseCentralized ? pair : ''
  );
  
  const [fallbackState] = useState({
    priceData: [],
    currentPrice: null,
    isMarketOpen: false,
    lastUpdateTime: 'No centralized data available'
  });

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

  // Initialize centralized data only - no client-side generation
  useEffect(() => {
    mountedRef.current = true;
    
    if (shouldUseCentralized && !marketData) {
      // Trigger initial market update only if no centralized data exists
      triggerMarketUpdate();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [pair, shouldUseCentralized, marketData, triggerMarketUpdate]);

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

  // Return centralized data or indicate unsupported pair
  if (shouldUseCentralized) {
    return {
      priceData: marketData?.priceHistory || [],
      currentPrice: marketData?.currentPrice || null,
      isMarketOpen: marketData?.isMarketOpen ?? checkMarketHours(),
      lastUpdateTime: marketData?.lastUpdate || '',
      dataSource: `${dataSource} (Centralized)`,
      isConnected: isConnected,
      getPriceChange,
      getSparklineData
    };
  }

  // For unsupported pairs, return empty state instead of generating data
  return {
    priceData: fallbackState.priceData,
    currentPrice: fallbackState.currentPrice,
    isMarketOpen: false,
    lastUpdateTime: fallbackState.lastUpdateTime,
    dataSource: `${pair} not centralized - no data available`,
    isConnected: false,
    getPriceChange,
    getSparklineData
  };
};
