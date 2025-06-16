
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminSignal {
  id: string;
  symbol: string;
  type: string;
  price: number;
  confidence: number;
  status: string;
  take_profits: number[];
  created_at: string;
}

interface SignalStats {
  totalSignals: number;
  activeSignals: number;
  successRate: number;
  avgPips: number;
}

export const useAdminSignals = () => {
  const [signals, setSignals] = useState<AdminSignal[]>([]);
  const [stats, setStats] = useState<SignalStats>({
    totalSignals: 0,
    activeSignals: 0,
    successRate: 0,
    avgPips: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    try {
      const { data: signalsData } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: outcomes } = await supabase
        .from('signal_outcomes')
        .select('hit_target, pnl_pips');

      const totalSignals = signalsData?.length || 0;
      const activeSignals = signalsData?.filter(s => s.status === 'active').length || 0;
      const successRate = outcomes?.length ? 
        Math.round((outcomes.filter(o => o.hit_target).length / outcomes.length) * 100) : 0;
      const avgPips = outcomes?.length ?
        Math.round(outcomes.reduce((sum, o) => sum + (o.pnl_pips || 0), 0) / outcomes.length) : 0;

      setSignals(signalsData || []);
      setStats({
        totalSignals,
        activeSignals,
        successRate,
        avgPips
      });
    } catch (error) {
      console.error('Error fetching admin signals:', error);
    } finally {
      setLoading(false);
    }
  };

  return { signals, stats, loading, refetch: fetchSignals };
};
