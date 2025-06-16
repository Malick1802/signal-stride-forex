
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  sms_verified: boolean;
  subscription_status?: string;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('user_id, subscribed, is_trial_active');

      const usersWithSubscription = (profiles || []).map(profile => {
        const subscription = subscribers?.find(s => s.user_id === profile.id);
        let status = 'free';
        if (subscription?.subscribed) status = 'active';
        else if (subscription?.is_trial_active) status = 'trial';
        
        return {
          ...profile,
          subscription_status: status
        };
      });

      setUsers(usersWithSubscription);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    // Implementation for updating user status
    console.log('Update user status:', userId, status);
  };

  const updateUserSubscription = async (userId: string, subscription: any) => {
    // Implementation for updating user subscription
    console.log('Update user subscription:', userId, subscription);
  };

  return {
    users,
    loading,
    updateUserStatus,
    updateUserSubscription,
    refetch: fetchUsers
  };
};
