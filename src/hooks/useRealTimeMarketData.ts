
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCentralizedMarketData } from './useCentralizedMarketData';
import { calculateSignalPerformance } from '@/utils/pipCalculator';

interface UseRealTimeMarketDataProps {
  pair: string;
  entryPrice: string | number;
  enabled?: boolean; // New prop for conditional fetching
}

interface PriceChangeData {
  change: number;
  percentage: number;
  isProfit: boolean;
}

export const useRealTimeMarketData = ({ 
  pair, 
  entryPrice, 
  enabled = true 
}: UseRealTimeMarketDataProps) => {
  const [priceData, setPriceData] = useState<Array<{ timestamp: number; time: string; price: number }>>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('Initializing...');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // Only fetch centralized data when enabled and connected
  const {
    marketData,
    isConnected: centralizedConnected,
    dataSource: centralizedDataSource,
    isLoading: centralizedLoading
  } = useCentralizedMarketData(enabled && pair ? pair : '');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || !mountedRef.current) {
      setIsLoading(false);
      return;
    }

    if (marketData && marketData.priceHistory.length > 0) {
      const transformedData = marketData.priceHistory.map(point => ({
        timestamp: point.timestamp,
        time: point.time,
        price: point.price
      }));

      setPriceData(transformedData);
      setCurrentPrice(marketData.currentPrice);
      setLastUpdateTime(marketData.lastUpdate);
      setDataSource(centralizedDataSource);
      setIsConnected(centralizedConnected && marketData.isMarketOpen);
      setIsLoading(false);
    } else if (!centralizedLoading) {
      // Fallback when no market data but not loading
      const fallbackPrice = parseFloat(entryPrice.toString());
      if (!isNaN(fallbackPrice)) {
        setCurrentPrice(fallbackPrice);
        setDataSource('Entry Price (Market Closed)');
        setIsConnected(false);
      }
      setIsLoading(false);
    }
  }, [marketData, centralizedConnected, centralizedDataSource, centralizedLoading, entryPrice, enabled]);

  const getPriceChange = useCallback((): PriceChangeData => {
    if (!currentPrice || !entryPrice || !enabled) {
      return { change: 0, percentage: 0, isProfit: false };
    }

    // Use real FastForex prices for accurate pip calculations
    const entryPriceNum = parseFloat(entryPrice.toString());
    const fastforexPrice = marketData?.currentPrice || currentPrice; // Ensure we use FastForex price
    const change = fastforexPrice - entryPriceNum;
    const percentage = entryPriceNum > 0 ? (change / entryPriceNum) * 100 : 0;
    
    // Validate pip calculation accuracy with FastForex precision
    const isPipCalculationValid = Math.abs(change) > 0.00001; // Minimum meaningful change
    
    return {
      change: isPipCalculationValid ? change : 0,
      percentage: isPipCalculationValid ? percentage : 0,
      isProfit: change > 0
    };
  }, [currentPrice, entryPrice, enabled, marketData]);

  return {
    priceData: enabled ? priceData : [],
    currentPrice: enabled ? currentPrice : null,
    getPriceChange,
    dataSource: enabled ? dataSource : 'Disabled',
    lastUpdateTime: enabled ? lastUpdateTime : '',
    isConnected: enabled ? isConnected : false,
    isMarketOpen: enabled ? (marketData?.isMarketOpen ?? false) : false,
    isLoading: enabled ? isLoading : false
  };
};
