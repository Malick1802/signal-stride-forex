
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all users with profiles and roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('useUserManagement: Fetching users...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          phone_number,
          sms_verified,
          user_roles(role),
          subscribers(subscribed, subscription_tier, trial_end, subscription_end)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('useUserManagement: Error fetching users:', error);
        throw error;
      }

      console.log('useUserManagement: Fetched users:', data?.length);
      return data;
    },
  });

  // Fetch user statistics
  const { data: userStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: activeSubscribers },
        { count: trialUsers },
        { count: adminUsers }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscribed', true),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_trial_active', true),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin')
      ]);

      return {
        totalUsers: totalUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        trialUsers: trialUsers || 0,
        adminUsers: adminUsers || 0
      };
    },
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      console.log('useUserManagement: Updating user role:', userId, role);
      
      if (role === 'admin') {
        const { error } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
    },
  });

  return {
    users,
    usersLoading,
    userStats,
    updateUserRole
  };
};
