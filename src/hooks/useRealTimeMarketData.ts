
// DEPRECATED: Real-time market data now centralized in database
// Use signal's current_price, current_pips, current_percentage instead
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealTimeMarketDataProps {
  pair: string;
  signalId?: string; // For getting centralized performance data
  enabled?: boolean;
}

interface CentralizedPriceData {
  currentPrice: number | null;
  lastUpdate: string;
  isMarketOpen: boolean;
}

export const useRealTimeMarketData = ({ 
  pair, 
  signalId,
  enabled = true 
}: UseRealTimeMarketDataProps) => {
  const [priceData, setPriceData] = useState<CentralizedPriceData>({
    currentPrice: null,
    lastUpdate: '',
    isMarketOpen: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !pair) {
      setIsLoading(false);
      return;
    }

    const fetchCentralizedPrice = async () => {
      try {
        // Get current market price from centralized state
        const { data: marketData } = await supabase
          .from('centralized_market_state')
          .select('current_price, last_update, is_market_open')
          .eq('symbol', pair)
          .single();

        if (marketData) {
          setPriceData({
            currentPrice: marketData.current_price,
            lastUpdate: marketData.last_update,
            isMarketOpen: marketData.is_market_open
          });
        }
      } catch (error) {
        console.error('Error fetching centralized market data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCentralizedPrice();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`market-${pair}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state',
          filter: `symbol=eq.${pair}`
        },
        (payload) => {
          const newData = payload.new as any;
          setPriceData({
            currentPrice: newData.current_price,
            lastUpdate: newData.last_update,
            isMarketOpen: newData.is_market_open
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pair, enabled]);

  return {
    currentPrice: priceData.currentPrice,
    lastUpdateTime: priceData.lastUpdate,
    isMarketOpen: priceData.isMarketOpen,
    isLoading,
    dataSource: 'Centralized FastForex',
    isConnected: priceData.currentPrice !== null
  };
};
