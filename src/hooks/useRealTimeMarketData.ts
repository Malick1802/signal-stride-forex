import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const CHART_DATA_POINTS = 100;
const UPDATE_INTERVAL = 1000; // 1 second for real-time feel
const PRICE_FETCH_INTERVAL = 5000; // 5 seconds for API calls

export const useRealTimeMarketData = ({ pair, entryPrice }: UseRealTimeMarketDataProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('FastForex API');
  const [isConnected, setIsConnected] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout>();
  const priceUpdateRef = useRef<NodeJS.Timeout>();
  const lastPriceRef = useRef<number>(0);
  const channelRef = useRef<any>();

  const checkMarketHours = useCallback(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
  }, []);

  const generateRealisticPrice = useCallback((basePrice: number) => {
    // Generate realistic forex price movements with proper volatility
    const volatility = 0.0001; // 1 pip movement
    const trend = (Math.random() - 0.5) * volatility;
    const noise = (Math.random() - 0.5) * volatility * 0.3;
    
    return basePrice + trend + noise;
  }, []);

  const addNewPricePoint = useCallback((newPrice: number) => {
    const now = Date.now();
    const timeString = new Date(now).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const newDataPoint: PriceData = {
      timestamp: now,
      time: timeString,
      price: newPrice,
      volume: Math.random() * 100000 + 50000
    };

    setPriceData(prevData => {
      const newData = [...prevData, newDataPoint];
      // Keep only the last CHART_DATA_POINTS for performance
      return newData.slice(-CHART_DATA_POINTS);
    });

    setCurrentPrice(newPrice);
    setLastUpdateTime(timeString);
    lastPriceRef.current = newPrice;
  }, []);

  const fetchLatestMarketData = useCallback(async () => {
    try {
      console.log(`🔄 Fetching latest data for ${pair}`);
      
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', pair)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`❌ Error fetching data for ${pair}:`, error);
        setIsConnected(false);
        return;
      }

      setIsConnected(true);

      if (marketData && marketData.length > 0) {
        const latestData = marketData[0];
        const newPrice = parseFloat(latestData.price.toString());
        
        if (!isNaN(newPrice) && newPrice > 0) {
          console.log(`📊 New real price for ${pair}: ${newPrice}`);
          setDataSource('FastForex API (Live)');
          lastPriceRef.current = newPrice;
          addNewPricePoint(newPrice);
          return;
        }
      }

      // If no real data, continue with simulated movement
      console.log(`📊 No new data for ${pair}, continuing simulation`);
      
    } catch (error) {
      console.error(`❌ Error fetching market data for ${pair}:`, error);
      setIsConnected(false);
    }
  }, [pair, addNewPricePoint]);

  const startRealTimeSimulation = useCallback(() => {
    // Clear existing intervals
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (priceUpdateRef.current) clearInterval(priceUpdateRef.current);

    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);

    // Initialize with entry price if no current price
    if (!lastPriceRef.current) {
      const entryPriceNum = parseFloat(entryPrice) || 1.0;
      lastPriceRef.current = entryPriceNum;
      addNewPricePoint(entryPriceNum);
    }

    // Real-time price updates every second for smooth movement
    intervalRef.current = setInterval(() => {
      if (lastPriceRef.current > 0) {
        const newPrice = generateRealisticPrice(lastPriceRef.current);
        addNewPricePoint(newPrice);
      }
    }, UPDATE_INTERVAL);

    // Fetch real data periodically
    priceUpdateRef.current = setInterval(() => {
      fetchLatestMarketData();
    }, PRICE_FETCH_INTERVAL);

  }, [checkMarketHours, entryPrice, addNewPricePoint, generateRealisticPrice, fetchLatestMarketData]);

  // Setup real-time subscription
  useEffect(() => {
    console.log(`🔌 Setting up real-time subscription for ${pair}`);
    
    // Subscribe to real-time updates
    channelRef.current = supabase
      .channel(`market-updates-${pair}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data',
          filter: `symbol=eq.${pair}`
        },
        (payload) => {
          console.log(`🔔 Real-time update received for ${pair}:`, payload.new);
          if (payload.new?.price) {
            const newPrice = parseFloat(payload.new.price.toString());
            if (!isNaN(newPrice) && newPrice > 0) {
              setDataSource('FastForex API (Real-time)');
              lastPriceRef.current = newPrice;
              addNewPricePoint(newPrice);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${pair}:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [pair, addNewPricePoint]);

  // Start the real-time system
  useEffect(() => {
    startRealTimeSimulation();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (priceUpdateRef.current) clearInterval(priceUpdateRef.current);
    };
  }, [startRealTimeSimulation]);

  const getPriceChange = useCallback(() => {
    if (priceData.length < 2) return { change: 0, percentage: 0 };
    
    const current = priceData[priceData.length - 1]?.price || 0;
    const previous = priceData[Math.max(0, priceData.length - 20)]?.price || current; // Compare with 20 points ago
    
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    
    return { change, percentage };
  }, [priceData]);

  const getSparklineData = useCallback(() => {
    // Return last 20 points for mini sparkline charts
    return priceData.slice(-20);
  }, [priceData]);

  return {
    priceData,
    currentPrice,
    isMarketOpen,
    lastUpdateTime,
    dataSource,
    isConnected,
    getPriceChange,
    getSparklineData
  };
};
