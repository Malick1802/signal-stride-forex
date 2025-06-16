
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NetworkMember {
  id: string;
  affiliate_code: string;
  total_earnings: number;
  total_referrals: number;
  tier: string;
  status: string;
  level: number;
  user: {
    email: string;
    full_name?: string;
  };
  children: NetworkMember[];
}

export const useMLMNetwork = (affiliateId?: string) => {
  const [network, setNetwork] = useState<NetworkMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDownline: 0,
    level1Count: 0,
    level2Count: 0,
    level3Count: 0,
    totalDownlineEarnings: 0
  });

  const fetchNetworkData = async () => {
    if (!affiliateId) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-mlm-network', {
        body: { affiliateId }
      });

      if (error) {
        console.error('Error fetching network data:', error);
        return;
      }

      setNetwork(data.network || []);
      setStats(data.stats || {
        totalDownline: 0,
        level1Count: 0,
        level2Count: 0,
        level3Count: 0,
        totalDownlineEarnings: 0
      });
    } catch (error) {
      console.error('Error fetching network data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, [affiliateId]);

  return {
    network,
    stats,
    loading,
    refreshNetwork: fetchNetworkData
  };
};
