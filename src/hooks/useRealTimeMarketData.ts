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
  
  const { marketData, isConnected, dataSource, triggerMarketUpdate, triggerTickGenerator } = useCentralizedMarketData(
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
  const fallbackIntervalRef = useRef<NodeJS.Timeout>();

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

  // Fallback data for unsupported pairs - with simulated real-time updates
  const generateFallbackData = useCallback(() => {
    const entryPriceNum = parseFloat(entryPrice) || 1.0;
    if (isNaN(entryPriceNum) || entryPriceNum <= 0) {
      return;
    }
    
    const now = Date.now();
    
    // Update existing data or create new
    setFallbackData(prev => {
      const newDataPoint = {
        timestamp: now,
        time: new Date(now).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        price: entryPriceNum * (1 + (Math.random() - 0.5) * 0.002),
        volume: Math.random() * 100000
      };

      // Keep last 30 data points and add new one
      const updatedData = [...prev.priceData, newDataPoint].slice(-30);
      
      return {
        priceData: updatedData,
        currentPrice: newDataPoint.price,
        isMarketOpen: checkMarketHours(),
        lastUpdateTime: new Date().toLocaleTimeString()
      };
    });
  }, [entryPrice, checkMarketHours]);

  // Initialize data and real-time updates with tick generation
  useEffect(() => {
    mountedRef.current = true;
    
    if (shouldUseCentralized) {
      // Trigger initial market update if no centralized data
      if (!marketData) {
        triggerMarketUpdate();
      }
      
      // Start tick generation for real-time movement
      const tickInterval = setInterval(() => {
        if (mountedRef.current && isConnected) {
          triggerTickGenerator();
        }
      }, 2000); // Generate ticks every 2 seconds

      return () => {
        mountedRef.current = false;
        clearInterval(tickInterval);
      };
    } else {
      // Generate initial fallback data
      generateFallbackData();
      
      // Set up real-time simulation for unsupported pairs
      fallbackIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          generateFallbackData();
        }
      }, 1000); // Update every 1 second for fallback

      return () => {
        mountedRef.current = false;
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
        }
      };
    }
  }, [pair, shouldUseCentralized, marketData, triggerMarketUpdate, triggerTickGenerator, isConnected, generateFallbackData]);

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
      dataSource: `${dataSource} (Real-time Ticks)`,
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
    dataSource: `Simulated Real-time (${pair} not centralized)`,
    isConnected: true, // Always connected for simulated data
    getPriceChange,
    getSparklineData
  };
};
