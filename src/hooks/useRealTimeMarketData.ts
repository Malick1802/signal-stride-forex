
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

export const useRealTimeMarketData = ({ pair, entryPrice }: UseRealTimeMarketDataProps) => {
  const { marketData, isConnected, dataSource, triggerMarketUpdate } = useCentralizedMarketData(pair);
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

  // Initialize market data update on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Trigger initial market update if no data
    if (!marketData) {
      console.log(`🔄 Initializing centralized data for ${pair}`);
      triggerMarketUpdate();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [pair, marketData, triggerMarketUpdate]);

  const getPriceChange = useCallback(() => {
    if (!marketData || marketData.priceHistory.length < 2) {
      return { change: 0, percentage: 0 };
    }
    
    return {
      change: marketData.change24h,
      percentage: marketData.changePercentage
    };
  }, [marketData]);

  const getSparklineData = useCallback(() => {
    if (!marketData) return [];
    return marketData.priceHistory.slice(-20);
  }, [marketData]);

  // Return centralized data or fallback values
  return {
    priceData: marketData?.priceHistory || [],
    currentPrice: marketData?.currentPrice || null,
    isMarketOpen: marketData?.isMarketOpen ?? checkMarketHours(),
    lastUpdateTime: marketData?.lastUpdate || '',
    dataSource: dataSource,
    isConnected: isConnected,
    getPriceChange,
    getSparklineData
  };
};
