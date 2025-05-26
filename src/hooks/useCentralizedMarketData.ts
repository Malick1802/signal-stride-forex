
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface CentralizedMarketData {
  symbol: string;
  currentPrice: number;
  bid: number;
  ask: number;
  lastUpdate: string;
  isMarketOpen: boolean;
  priceHistory: PriceData[];
  change24h: number;
  changePercentage: number;
}

export const useCentralizedMarketData = (symbol: string) => {
  const [marketData, setMarketData] = useState<CentralizedMarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<string>('Centralized FastForex');
  const channelRef = useRef<any>();
  const mountedRef = useRef(true);

  const fetchCentralizedData = useCallback(async () => {
    if (!symbol || !mountedRef.current) return;

    try {
      console.log(`🔄 Fetching centralized data for ${symbol}`);

      // Get current market state
      const { data: marketState, error: stateError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stateError) {
        console.error(`❌ Error fetching market state for ${symbol}:`, stateError);
        return;
      }

      // Get price history (last 100 points)
      const { data: priceHistory, error: historyError } = await supabase
        .from('live_price_history')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (historyError) {
        console.error(`❌ Error fetching price history for ${symbol}:`, historyError);
        return;
      }

      if (!mountedRef.current) return;

      if (marketState) {
        // Transform price history for charts
        const chartData: PriceData[] = (priceHistory || [])
          .reverse()
          .map((item, index) => ({
            timestamp: new Date(item.timestamp).getTime(),
            time: new Date(item.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            price: parseFloat(item.price.toString()),
            volume: Math.random() * 100000 + 50000
          }));

        // Calculate 24h change (compare with oldest price in history)
        let change24h = 0;
        let changePercentage = 0;
        
        if (chartData.length >= 2) {
          const currentPrice = chartData[chartData.length - 1].price;
          const oldPrice = chartData[0].price;
          change24h = currentPrice - oldPrice;
          changePercentage = (change24h / oldPrice) * 100;
        }

        const centralizedData: CentralizedMarketData = {
          symbol: marketState.symbol,
          currentPrice: parseFloat(marketState.current_price.toString()),
          bid: parseFloat(marketState.bid?.toString() || '0'),
          ask: parseFloat(marketState.ask?.toString() || '0'),
          lastUpdate: new Date(marketState.last_update).toLocaleTimeString(),
          isMarketOpen: marketState.is_market_open || false,
          priceHistory: chartData,
          change24h,
          changePercentage
        };

        setMarketData(centralizedData);
        setIsConnected(true);
        setDataSource('Centralized FastForex (Real-time)');
        
        console.log(`📊 Updated centralized data for ${symbol}:`, {
          price: centralizedData.currentPrice,
          historyPoints: chartData.length,
          change: change24h.toFixed(5)
        });
      }

    } catch (error) {
      console.error(`❌ Error in fetchCentralizedData for ${symbol}:`, error);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [symbol]);

  // Set up real-time subscriptions to centralized data
  useEffect(() => {
    if (!symbol) return;

    mountedRef.current = true;
    fetchCentralizedData();

    console.log(`🔌 Setting up centralized real-time subscription for ${symbol}`);

    // Subscribe to market state changes
    const stateChannel = supabase
      .channel(`centralized-market-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'centralized_market_state',
          filter: `symbol=eq.${symbol}`
        },
        (payload) => {
          if (!mountedRef.current) return;
          console.log(`🔔 Centralized market state update for ${symbol}:`, payload);
          fetchCentralizedData();
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        console.log(`📡 Market state subscription status for ${symbol}:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to price history updates
    const historyChannel = supabase
      .channel(`centralized-history-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_price_history',
          filter: `symbol=eq.${symbol}`
        },
        (payload) => {
          if (!mountedRef.current) return;
          console.log(`🔔 New price history for ${symbol}:`, payload.new);
          fetchCentralizedData();
        }
      )
      .subscribe();

    channelRef.current = { stateChannel, historyChannel };

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.stateChannel);
        supabase.removeChannel(channelRef.current.historyChannel);
        channelRef.current = null;
      }
    };
  }, [symbol, fetchCentralizedData]);

  // Trigger centralized market stream update
  const triggerMarketUpdate = useCallback(async () => {
    try {
      console.log('🚀 Triggering centralized market stream update...');
      const { data, error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ Market stream update failed:', error);
      } else {
        console.log('✅ Market stream update triggered:', data);
        setTimeout(fetchCentralizedData, 2000);
      }
    } catch (error) {
      console.error('❌ Error triggering market update:', error);
    }
  }, [fetchCentralizedData]);

  return {
    marketData,
    isConnected,
    dataSource,
    triggerMarketUpdate,
    refetch: fetchCentralizedData
  };
};
