
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

// Supported pairs that have centralized real-time data
const SUPPORTED_CENTRALIZED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
];

export const useRealTimeMarketData = ({ pair, entryPrice }: UseRealTimeMarketDataProps) => {
  const shouldUseCentralized = SUPPORTED_CENTRALIZED_PAIRS.includes(pair);
  
  const { marketData, isConnected, dataSource, triggerMarketUpdate } = useCentralizedMarketData(
    shouldUseCentralized ? pair : ''
  );
  
  const [fallbackData, setFallbackData] = useState<{
    priceData: PriceData[];
    currentPrice: number | null;
    isMarketOpen: boolean;
    lastUpdateTime: string;
  }>({
    priceData: [],
    currentPrice: null,
    isMarketOpen: false,
    lastUpdateTime: ''
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

  // Fallback data for unsupported pairs
  const generateFallbackData = useCallback(() => {
    const entryPriceNum = parseFloat(entryPrice) || 1.0;
    if (isNaN(entryPriceNum) || entryPriceNum <= 0) {
      return;
    }
    
    const now = Date.now();
    const fallbackPriceData = Array.from({ length: 20 }, (_, i) => ({
      timestamp: now - (20 - i) * 60000,
      time: new Date(now - (20 - i) * 60000).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: entryPriceNum * (1 + (Math.random() - 0.5) * 0.002),
      volume: Math.random() * 100000
    }));
    
    setFallbackData({
      priceData: fallbackPriceData,
      currentPrice: fallbackPriceData[fallbackPriceData.length - 1].price,
      isMarketOpen: checkMarketHours(),
      lastUpdateTime: new Date().toLocaleTimeString()
    });
  }, [entryPrice, checkMarketHours]);

  // Initialize data
  useEffect(() => {
    mountedRef.current = true;
    
    if (shouldUseCentralized) {
      // Trigger initial market update if no centralized data
      if (!marketData) {
        triggerMarketUpdate();
      }
    } else {
      // Generate fallback data for unsupported pairs
      generateFallbackData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [pair, shouldUseCentralized, marketData, triggerMarketUpdate, generateFallbackData]);

  const getPriceChange = useCallback(() => {
    if (shouldUseCentralized && marketData) {
      return {
        change: marketData.change24h,
        percentage: marketData.changePercentage
      };
    }
    
    if (!shouldUseCentralized && fallbackData.priceData.length >= 2) {
      const current = fallbackData.priceData[fallbackData.priceData.length - 1]?.price || 0;
      const previous = fallbackData.priceData[0]?.price || 0;
      const change = current - previous;
      const percentage = previous > 0 ? (change / previous) * 100 : 0;
      return { change, percentage };
    }
    
    return { change: 0, percentage: 0 };
  }, [shouldUseCentralized, marketData, fallbackData]);

  const getSparklineData = useCallback(() => {
    if (shouldUseCentralized && marketData) {
      return marketData.priceHistory.slice(-20);
    }
    return fallbackData.priceData.slice(-20);
  }, [shouldUseCentralized, marketData, fallbackData]);

  // Return appropriate data based on pair support
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

  return {
    priceData: fallbackData.priceData,
    currentPrice: fallbackData.currentPrice,
    isMarketOpen: fallbackData.isMarketOpen,
    lastUpdateTime: fallbackData.lastUpdateTime,
    dataSource: `Entry Price Simulation (${pair} not in centralized stream)`,
    isConnected: false,
    getPriceChange,
    getSparklineData
  };
};
