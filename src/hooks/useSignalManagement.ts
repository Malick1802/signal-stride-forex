
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSignalManagement = () => {
  // Fetch signal statistics
  const { data: signalStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-signal-stats'],
    queryFn: async () => {
      console.log('useSignalManagement: Fetching signal stats...');
      
      const [
        { count: totalSignals },
        { count: activeSignals },
        { count: expiredSignals },
        successfulSignals
      ] = await Promise.all([
        supabase.from('trading_signals').select('*', { count: 'exact', head: true }),
        supabase.from('trading_signals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('trading_signals').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('signal_outcomes').select('*', { count: 'exact', head: true }).eq('hit_target', true)
      ]);

      const successCount = successfulSignals.count || 0;
      const successRate = totalSignals && totalSignals > 0 ? Math.round((successCount / totalSignals) * 100) : 0;

      return {
        totalSignals: totalSignals || 0,
        activeSignals: activeSignals || 0,
        expiredSignals: expiredSignals || 0,
        successRate
      };
    },
  });

  // Fetch recent signals with outcomes
  const { data: recentSignals, isLoading: signalsLoading } = useQuery({
    queryKey: ['admin-recent-signals'],
    queryFn: async () => {
      console.log('useSignalManagement: Fetching recent signals...');
      
      const { data, error } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          type,
          price,
          confidence,
          status,
          created_at,
          signal_outcomes(hit_target, exit_price, pnl_pips)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('useSignalManagement: Error fetching signals:', error);
        throw error;
      }

      return data;
    },
  });

  return {
    signalStats,
    statsLoading,
    recentSignals,
    signalsLoading
  };
};
