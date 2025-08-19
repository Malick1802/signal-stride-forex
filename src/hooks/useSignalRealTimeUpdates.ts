import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradingSignal } from '@/types/signals';

interface UseSignalRealTimeUpdatesProps {
  onSignalUpdate: (updatedSignal: TradingSignal) => void;
  enabled?: boolean;
}

export const useSignalRealTimeUpdates = ({ 
  onSignalUpdate, 
  enabled = true 
}: UseSignalRealTimeUpdatesProps) => {
  useEffect(() => {
    if (!enabled) return;

    console.log('🔄 Setting up real-time signal performance updates');

    // Subscribe to signal performance updates
    const channel = supabase
      .channel('signal-performance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trading_signals',
          filter: 'status=eq.active'
        },
        (payload) => {
          console.log('📊 Real-time signal performance update:', {
            signalId: payload.new.id,
            symbol: payload.new.symbol,
            currentPrice: payload.new.current_price,
            currentPips: payload.new.current_pips,
            currentPercentage: payload.new.current_percentage,
            lastUpdate: payload.new.last_performance_update
          });
          
          // Notify parent component of the updated signal
          onSignalUpdate(payload.new as TradingSignal);
        }
      )
      .subscribe((status) => {
        console.log('📡 Signal performance subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to signal performance updates');
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from signal performance updates');
      supabase.removeChannel(channel);
    };
  }, [enabled, onSignalUpdate]);
};