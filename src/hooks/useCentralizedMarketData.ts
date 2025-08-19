import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CentralizedMarketData {
  symbol: string;
  current_price: number;
  is_market_open: boolean;
  last_update: string;
  source: string;
}

interface UseCentralizedMarketDataProps {
  pair?: string;
  enabled?: boolean;
}

export const useCentralizedMarketData = ({ 
  pair, 
  enabled = true 
}: UseCentralizedMarketDataProps = {}) => {
  const [data, setData] = useState<CentralizedMarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pair || !enabled) return;

    const fetchMarketData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: marketData, error } = await supabase
          .from('centralized_market_state')
          .select('*')
          .eq('symbol', pair)
          .single();

        if (error) {
          console.warn('Market data fetch error:', error);
          setError(error.message);
          return;
        }

        if (marketData) {
          setData({
            symbol: marketData.symbol,
            current_price: marketData.current_price,
            is_market_open: marketData.is_market_open ?? true,
            last_update: marketData.last_update,
            source: marketData.source || 'centralized'
          });
        }
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError('Failed to fetch market data');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchMarketData();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`market_${pair}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'centralized_market_state',
          filter: `symbol=eq.${pair}`
        },
        (payload) => {
          console.log('Market data update received:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            setData({
              symbol: newData.symbol,
              current_price: newData.current_price,
              is_market_open: newData.is_market_open ?? true,
              last_update: newData.last_update,
              source: newData.source || 'centralized'
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [pair, enabled]);

  return {
    currentPrice: data?.current_price || null,
    isMarketOpen: data?.is_market_open ?? true,
    lastUpdateTime: data?.last_update || null,
    dataSource: data?.source || 'centralized',
    isLoading,
    error,
    isConnected: !!data && !error
  };
};