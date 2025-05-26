
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface UseSignalMarketDataProps {
  pair: string;
  entryPrice: string;
}

export const useSignalMarketData = ({ pair, entryPrice }: UseSignalMarketDataProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('FastForex API');

  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
  };

  const setFallbackData = () => {
    const entryPriceNum = parseFloat(entryPrice) || 1.0;
    if (isNaN(entryPriceNum) || entryPriceNum <= 0) {
      console.error(`Invalid entry price for ${pair}: ${entryPrice}`);
      return;
    }
    
    setCurrentPrice(entryPriceNum);
    setDataSource('Entry Price (Demo)');
    
    const now = Date.now();
    const fallbackData = Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - (10 - i) * 60000,
      time: new Date(now - (10 - i) * 60000).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: entryPriceNum * (1 + (Math.random() - 0.5) * 0.001),
      volume: Math.random() * 100000
    }));
    
    setPriceData(fallbackData);
  };

  const fetchRealMarketData = async () => {
    try {
      console.log(`Fetching market data for ${pair}`);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', pair)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error(`Error fetching market data for ${pair}:`, error);
        setFallbackData();
        return;
      }

      if (marketData && marketData.length > 0) {
        console.log(`📊 Found ${marketData.length} records for ${pair}`);
        const transformedData = marketData.reverse().map((item, index) => ({
          timestamp: new Date(item.created_at || item.timestamp).getTime(),
          time: new Date(item.created_at || item.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }),
          price: parseFloat((item.price || 0).toString()),
          volume: Math.random() * 500000
        }));

        const validData = transformedData.filter(item => 
          !isNaN(item.price) && item.price > 0 && isFinite(item.price)
        );

        if (validData.length > 0) {
          setPriceData(validData);
          const latestPrice = validData[validData.length - 1]?.price;
          setCurrentPrice(latestPrice);
          setLastUpdateTime(new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }));
          setDataSource('FastForex API (Live)');
          console.log(`📊 Updated ${pair} with real price: ${latestPrice}`);
        } else {
          console.log(`Invalid price data for ${pair}, using fallback`);
          setFallbackData();
        }
      } else {
        console.log(`No recent data for ${pair}, using entry price`);
        setFallbackData();
      }
    } catch (error) {
      console.error('Error in fetchRealMarketData:', error);
      setFallbackData();
    }
  };

  useEffect(() => {
    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);
    
    setFallbackData();
    fetchRealMarketData();
    
    if (marketOpen) {
      const interval = setInterval(fetchRealMarketData, 30000);
      return () => clearInterval(interval);
    }
  }, [pair]);

  useEffect(() => {
    const channel = supabase
      .channel(`market-updates-${pair}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data',
          filter: `symbol=eq.${pair}`
        },
        () => {
          console.log(`🔔 Real-time update for ${pair}`);
          setTimeout(fetchRealMarketData, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pair]);

  const getPriceChange = () => {
    if (priceData.length < 2) return { change: 0, percentage: 0 };
    const current = priceData[priceData.length - 1]?.price || 0;
    const previous = priceData[0]?.price || 0;
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    return { change, percentage };
  };

  return {
    priceData,
    currentPrice,
    isMarketOpen,
    lastUpdateTime,
    dataSource,
    getPriceChange
  };
};
