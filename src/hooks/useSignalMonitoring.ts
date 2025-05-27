
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchActiveSignals, fetchCurrentPrices, checkSignalOutcomes } from '@/utils/activeSignalMonitor';

export const useSignalMonitoring = () => {
  const { toast } = useToast();

  const monitorActiveSignals = useCallback(async () => {
    try {
      // Get active signals
      const activeSignals = await fetchActiveSignals();
      if (!activeSignals.length) {
        return;
      }

      // Get current market prices
      const symbols = [...new Set(activeSignals.map(s => s.symbol))];
      const currentPrices = await fetchCurrentPrices(symbols);
      if (Object.keys(currentPrices).length === 0) {
        return;
      }

      // Check for outcomes
      await checkSignalOutcomes(activeSignals, currentPrices, toast);

    } catch (error) {
      console.error('❌ Error in signal monitoring:', error);
    }
  }, [toast]);

  useEffect(() => {
    // Initial check
    monitorActiveSignals();

    // Monitor every 30 seconds
    const monitorInterval = setInterval(monitorActiveSignals, 30000);

    // Subscribe to real-time price updates for immediate checking
    const priceChannel = supabase
      .channel('price-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Debounced check after price updates
          setTimeout(monitorActiveSignals, 2000);
        }
      )
      .subscribe();

    return () => {
      clearInterval(monitorInterval);
      supabase.removeChannel(priceChannel);
    };
  }, [monitorActiveSignals]);

  return {
    monitorActiveSignals
  };
};
