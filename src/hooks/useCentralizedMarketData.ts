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
    if (!enabled || !pair) return;
    
    console.log('🔄 Setting up centralized market data for:', pair);
    
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: marketData, error } = await supabase
          .from('centralized_market_state')
          .select('*')
          .eq('symbol', pair)
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching centralized market data:', error);
          setError(error.message);
          return;
        }

        if (marketData) {
          console.log('📊 Centralized market data received:', {
            symbol: marketData.symbol,
            price: marketData.current_price,
            isOpen: marketData.is_market_open,
            lastUpdate: marketData.last_update,
            source: marketData.source
          });
          setData({
            symbol: marketData.symbol,
            current_price: marketData.current_price,
            is_market_open: marketData.is_market_open ?? true,
            last_update: marketData.last_update,
            source: marketData.source || 'centralized'
          });
          setError(null); // Clear any previous errors
        }
      } catch (err) {
        console.error('❌ Error in fetchMarketData:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();

    // Set up realtime subscription for market data updates
    const channel = supabase
      .channel(`centralized-market-${pair}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state',
          filter: `symbol=eq.${pair}`
        },
        (payload) => {
          console.log('📡 Real-time centralized market update:', {
            symbol: payload.new.symbol,
            newPrice: payload.new.current_price,
            oldPrice: payload.old?.current_price,
            isMarketOpen: payload.new.is_market_open,
            source: payload.new.source,
            timestamp: payload.new.last_update
          });
          setData({
            symbol: payload.new.symbol,
            current_price: payload.new.current_price,
            is_market_open: payload.new.is_market_open ?? true,
            last_update: payload.new.last_update,
            source: payload.new.source || 'centralized'
          });
          setError(null); // Clear errors on successful update
        }
      )
      .subscribe((status) => {
        console.log('📡 Centralized market subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to centralized market data for:', pair);
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from centralized market data for:', pair);
      supabase.removeChannel(channel);
    };
  }, [enabled, pair]);

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