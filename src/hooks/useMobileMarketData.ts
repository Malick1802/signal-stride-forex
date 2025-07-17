import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  change_24h?: number;
  timestamp: string;
}

interface UseMobileMarketDataResult {
  marketData: Record<string, MarketData>;
  isConnected: boolean;
  error: string | null;
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
}

export const useMobileMarketData = (): UseMobileMarketDataResult => {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const subscribedSymbols = useRef<Set<string>>(new Set());

  useEffect(() => {
    setupRealtimeSubscription();
    
    return () => {
      cleanup();
    };
  }, []);

  const setupRealtimeSubscription = async () => {
    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
      }

      // Create new subscription for centralized market data
      subscriptionRef.current = supabase
        .channel('mobile-market-data')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'centralized_market_state'
          },
          (payload) => {
            console.log('📈 Market data update:', payload);
            handleMarketDataUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('📡 Market data subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') {
            setError(null);
            // Load initial data for subscribed symbols
            loadInitialMarketData();
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to connect to market data feed');
            setIsConnected(false);
          }
        });

      console.log('🔔 Real-time market data subscription setup complete');
    } catch (error) {
      console.error('❌ Failed to setup market data subscription:', error);
      setError('Failed to setup real-time market data');
      setIsConnected(false);
    }
  };

  const loadInitialMarketData = async () => {
    try {
      // Load latest market data for all active symbols
      const { data, error } = await supabase
        .from('centralized_market_state')
        .select('*')
        .order('last_update', { ascending: false });

      if (error) throw error;

      const initialData: Record<string, MarketData> = {};
      data?.forEach((item) => {
        initialData[item.symbol] = {
          symbol: item.symbol,
          price: item.current_price,
          bid: item.bid,
          ask: item.ask,
          change_24h: item.price_change_24h,
          timestamp: item.last_update
        };
      });

      setMarketData(initialData);
      console.log(`📊 Loaded initial market data for ${data?.length || 0} symbols`);
    } catch (error) {
      console.error('❌ Failed to load initial market data:', error);
      setError('Failed to load initial market data');
    }
  };

  const handleMarketDataUpdate = (payload: any) => {
    const { eventType, new: newData, old: oldData } = payload;

    if (eventType === 'UPDATE' || eventType === 'INSERT') {
      setMarketData(prev => ({
        ...prev,
        [newData.symbol]: {
          symbol: newData.symbol,
          price: newData.current_price,
          bid: newData.bid,
          ask: newData.ask,
          change_24h: newData.price_change_24h,
          timestamp: newData.last_update
        }
      }));
    } else if (eventType === 'DELETE' && oldData) {
      setMarketData(prev => {
        const updated = { ...prev };
        delete updated[oldData.symbol];
        return updated;
      });
    }
  };

  const subscribeToSymbol = (symbol: string) => {
    subscribedSymbols.current.add(symbol);
    console.log(`📈 Subscribed to market data for ${symbol}`);
    
    // Load current data for this symbol if we don't have it
    if (!marketData[symbol]) {
      loadSymbolData(symbol);
    }
  };

  const unsubscribeFromSymbol = (symbol: string) => {
    subscribedSymbols.current.delete(symbol);
    console.log(`📉 Unsubscribed from market data for ${symbol}`);
  };

  const loadSymbolData = async (symbol: string) => {
    try {
      const { data, error } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (error) throw error;

      if (data) {
        setMarketData(prev => ({
          ...prev,
          [symbol]: {
            symbol: data.symbol,
            price: data.current_price,
            bid: data.bid,
            ask: data.ask,
            change_24h: data.price_change_24h,
            timestamp: data.last_update
          }
        }));
      }
    } catch (error) {
      console.error(`❌ Failed to load data for ${symbol}:`, error);
    }
  };

  const cleanup = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    subscribedSymbols.current.clear();
  };

  return {
    marketData,
    isConnected,
    error,
    subscribeToSymbol,
    unsubscribeFromSymbol
  };
};