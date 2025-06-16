
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminAffiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: string;
  tier: string;
  total_referrals: number;
  total_earnings: number;
  created_at: string;
  user_email?: string;
}

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissions: number;
  conversionRate: number;
}

export const useAdminAffiliates = () => {
  const [affiliates, setAffiliates] = useState<AdminAffiliate[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalCommissions: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      const { data: affiliatesData } = await supabase
        .from('affiliates')
        .select(`
          *,
          profiles!affiliates_user_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('amount');

      const totalCommissions = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const totalAffiliates = affiliatesData?.length || 0;
      const activeAffiliates = affiliatesData?.filter(a => a.status === 'active').length || 0;
      
      const affiliatesWithEmail = (affiliatesData || []).map(affiliate => ({
        ...affiliate,
        user_email: (affiliate as any).profiles?.email
      }));

      setAffiliates(affiliatesWithEmail);
      setStats({
        totalAffiliates,
        activeAffiliates,
        totalCommissions: Math.round(totalCommissions),
        conversionRate: 12 // Mock conversion rate
      });
    } catch (error) {
      console.error('Error fetching admin affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  return { affiliates, stats, loading, refetch: fetchAffiliates };
};
