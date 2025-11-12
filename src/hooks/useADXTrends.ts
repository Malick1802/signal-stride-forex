import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ADXTrendData {
  symbol: string;
  timeframe: string;
  adx: number | null;
  plus_di: number | null;
  minus_di: number | null;
  di_separation: number | null;
  trend_strength: string | null;
  trend: string;
  last_updated: string;
}

export const useADXTrends = (symbol?: string) => {
  const [trends, setTrends] = useState<Record<string, ADXTrendData>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('market_structure_trends')
          .select('*')
          .order('last_updated', { ascending: false });

        if (symbol) {
          query = query.eq('symbol', symbol);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const trendsMap: Record<string, ADXTrendData> = {};
          data.forEach((trend) => {
            const key = `${trend.symbol}_${trend.timeframe}`;
            trendsMap[key] = trend as ADXTrendData;
          });
          setTrends(trendsMap);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching ADX trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [symbol]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('adx-trends-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_structure_trends',
          ...(symbol ? { filter: `symbol=eq.${symbol}` } : {})
        },
        (payload) => {
          console.log('📊 ADX trend update received:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTrend = payload.new as ADXTrendData;
            const key = `${newTrend.symbol}_${newTrend.timeframe}`;
            
            setTrends((prev) => ({
              ...prev,
              [key]: newTrend
            }));
            setLastUpdate(new Date());
          } else if (payload.eventType === 'DELETE') {
            const oldTrend = payload.old as ADXTrendData;
            const key = `${oldTrend.symbol}_${oldTrend.timeframe}`;
            
            setTrends((prev) => {
              const updated = { ...prev };
              delete updated[key];
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol]);

  return { trends, loading, lastUpdate };
};
