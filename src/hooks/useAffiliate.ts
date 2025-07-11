
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AffiliateData {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  commission_rate_l1: number;
  commission_rate_l2: number;
  commission_rate_l3: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_earnings: number;
  total_referrals: number;
  created_at: string;
  updated_at: string;
}

interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_user_id: string;
  subscription_id: string | null;
  commission_type: 'signup_bonus' | 'recurring_monthly' | 'recurring_annual';
  amount: number;
  level: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  transaction_date: string;
  created_at: string;
}

interface ReferralLink {
  id: string;
  affiliate_id: string;
  link_code: string;
  campaign_name: string | null;
  clicks: number;
  conversions: number;
  created_at: string;
  is_active: boolean;
}

export const useAffiliate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Check if user is already an affiliate
  const fetchAffiliateData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching affiliate data:', error);
        return;
      }

      if (data) {
        // Type assertion to ensure proper types
        setAffiliateData({
          ...data,
          status: data.status as AffiliateData['status'],
          tier: data.tier as AffiliateData['tier']
        });
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch affiliate commissions
  const fetchCommissions = async () => {
    if (!affiliateData) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching commissions:', error);
        return;
      }

      if (data) {
        // Type assertion to ensure proper types
        const typedCommissions = data.map(commission => ({
          ...commission,
          commission_type: commission.commission_type as AffiliateCommission['commission_type'],
          status: commission.status as AffiliateCommission['status']
        }));
        setCommissions(typedCommissions);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  // Fetch referral links
  const fetchReferralLinks = async () => {
    if (!affiliateData) return;

    try {
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching referral links:', error);
        return;
      }

      setReferralLinks(data || []);
    } catch (error) {
      console.error('Error fetching referral links:', error);
    }
  };

  // Register as affiliate
  const registerAffiliate = async (parentCode?: string) => {
    if (!user) return false;

    setRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-affiliate', {
        body: { parentCode }
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      if (data?.affiliate) {
        setAffiliateData({
          ...data.affiliate,
          status: data.affiliate.status as AffiliateData['status'],
          tier: data.affiliate.tier as AffiliateData['tier']
        });
      }
      
      toast({
        title: "Success!",
        description: "You've been registered as an affiliate. Your application is pending approval.",
      });
      return true;
    } catch (error) {
      console.error('Error registering affiliate:', error);
      toast({
        title: "Registration Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setRegistering(false);
    }
  };

  // Create referral link
  const createReferralLink = async (campaignName?: string) => {
    if (!affiliateData) return null;

    try {
      const { data, error } = await supabase.functions.invoke('create-referral-link', {
        body: { campaignName }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }

      await fetchReferralLinks();
      toast({
        title: "Success!",
        description: "Referral link created successfully.",
      });
      return data.link;
    } catch (error) {
      console.error('Error creating referral link:', error);
      toast({
        title: "Error",
        description: "Failed to create referral link.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Request payout
  const requestPayout = async (amount: number, paymentMethod: string = 'stripe') => {
    if (!affiliateData) return false;

    try {
      const { error } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliateData.id,
          amount,
          payment_method: paymentMethod
        });

      if (error) {
        toast({
          title: "Payout Request Failed",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Payout Requested",
        description: `Your payout request for $${amount} has been submitted.`,
      });
      return true;
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: "Error",
        description: "Failed to request payout.",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAffiliateData();
  }, [user]);

  useEffect(() => {
    if (affiliateData) {
      fetchCommissions();
      fetchReferralLinks();
    }
  }, [affiliateData]);

  return {
    affiliateData,
    commissions,
    referralLinks,
    loading,
    registering,
    registerAffiliate,
    createReferralLink,
    requestPayout,
    refreshData: () => {
      fetchAffiliateData();
      fetchCommissions();
      fetchReferralLinks();
    }
  };
};
