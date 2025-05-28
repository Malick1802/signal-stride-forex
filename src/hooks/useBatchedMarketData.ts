
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConnectionManager } from './useConnectionManager';

interface BatchedMarketData {
  symbol: string;
  currentPrice: number;
  priceHistory: Array<{ timestamp: number; time: string; price: number }>;
  lastUpdate: string;
  isMarketOpen: boolean;
}

interface UseBatchedMarketDataReturn {
  marketData: Record<string, BatchedMarketData>;
  isLoading: boolean;
  lastBatchUpdate: string;
  refetch: () => void;
}

const BATCH_UPDATE_INTERVAL = 5000; // 5 seconds instead of real-time
const CACHE_DURATION = 30000; // 30 seconds cache

export const useBatchedMarketData = (symbols: string[]): UseBatchedMarketDataReturn => {
  const [marketData, setMarketData] = useState<Record<string, BatchedMarketData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastBatchUpdate, setLastBatchUpdate] = useState('');
  
  const { queueRequest } = useConnectionManager();
  const lastFetchTime = useRef(0);
  const batchIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const fetchBatchedData = useCallback(async () => {
    const now = Date.now();
    
    // Check cache validity
    if (now - lastFetchTime.current < CACHE_DURATION) {
      return;
    }

    if (symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    await queueRequest(async () => {
      try {
        console.log(`🔄 Batch fetching data for ${symbols.length} symbols`);

        // Single batch query for current market state
        const { data: marketStates, error: stateError } = await supabase
          .from('centralized_market_state')
          .select('symbol, current_price, last_update, is_market_open')
          .in('symbol', symbols)
          .limit(50);

        if (stateError) {
          console.error('❌ Batch market state error:', stateError);
          return;
        }

        // Single batch query for price history
        const { data: priceHistory, error: historyError } = await supabase
          .from('live_price_history')
          .select('symbol, price, timestamp')
          .in('symbol', symbols)
          .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour
          .order('timestamp', { ascending: false })
          .limit(200);

        if (historyError) {
          console.error('❌ Batch price history error:', historyError);
        }

        if (!mountedRef.current) return;

        const batchedData: Record<string, BatchedMarketData> = {};

        // Process market states
        marketStates?.forEach(state => {
          const symbol = state.symbol;
          const symbolHistory = priceHistory?.filter(h => h.symbol === symbol) || [];
          
          batchedData[symbol] = {
            symbol,
            currentPrice: parseFloat(state.current_price.toString()),
            priceHistory: symbolHistory.map((point, index) => ({
              timestamp: new Date(point.timestamp).getTime(),
              time: `${index}`,
              price: parseFloat(point.price.toString())
            })).slice(0, 50), // Limit to 50 points
            lastUpdate: state.last_update || new Date().toISOString(),
            isMarketOpen: state.is_market_open ?? true
          };
        });

        setMarketData(batchedData);
        setLastBatchUpdate(new Date().toLocaleTimeString());
        lastFetchTime.current = now;
        
        console.log(`✅ Batch update completed: ${Object.keys(batchedData).length} symbols`);

      } catch (error) {
        console.error('❌ Batch fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    });
  }, [symbols, queueRequest]);

  const refetch = useCallback(() => {
    lastFetchTime.current = 0; // Force refresh
    fetchBatchedData();
  }, [fetchBatchedData]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchBatchedData();

    // Set up interval for batch updates (much less frequent)
    batchIntervalRef.current = setInterval(fetchBatchedData, BATCH_UPDATE_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current);
      }
    };
  }, [fetchBatchedData]);

  return {
    marketData,
    isLoading,
    lastBatchUpdate,
    refetch
  };
};
