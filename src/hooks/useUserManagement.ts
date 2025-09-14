
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all users with profiles and roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('useUserManagement: Fetching users...');

      // Fetch in parallel to avoid PostgREST embed FK requirements
      const [profilesRes, rolesRes, subsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, created_at, phone_number, sms_verified, push_new_signals, push_targets_hit')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_roles')
          .select('user_id, role'),
        supabase
          .from('subscribers')
          .select('user_id, subscribed, subscription_tier, trial_end, subscription_end, is_trial_active')
      ]);

      if (profilesRes.error) {
        console.error('useUserManagement: Error fetching profiles:', profilesRes.error);
        throw profilesRes.error;
      }
      if (rolesRes.error) {
        console.warn('useUserManagement: Error fetching user roles:', rolesRes.error);
      }
      if (subsRes.error) {
        console.warn('useUserManagement: Error fetching subscribers:', subsRes.error);
      }

      const rolesByUser = new Map<string, any[]>();
      (rolesRes.data || []).forEach((r: any) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push({ role: r.role });
        rolesByUser.set(r.user_id, list);
      });

      const subsByUser = new Map<string, any[]>();
      (subsRes.data || []).forEach((s: any) => {
        subsByUser.set(s.user_id, [{
          subscribed: !!s.subscribed,
          subscription_tier: s.subscription_tier ?? null,
          trial_end: s.trial_end ?? null,
          subscription_end: s.subscription_end ?? null,
          is_trial_active: !!s.is_trial_active,
        }]);
      });

      const combined = (profilesRes.data || []).map((p: any) => ({
        ...p,
        user_roles: rolesByUser.get(p.id) ?? [],
        subscribers: subsByUser.get(p.id) ?? [],
      }));

      console.log('useUserManagement: Fetched users:', combined.length);
      return combined;
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

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      console.log('useUserManagement: Deleting user:', userId);
      
      // Delete from profiles table (cascades to related tables)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
    },
  });

  // Update user subscription status
  const updateSubscription = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'activate' | 'deactivate' | 'trial' }) => {
      console.log('useUserManagement: Updating subscription:', userId, action);
      
      if (action === 'activate') {
        // Get user email for subscribers table
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
          
        const { error } = await supabase
          .from('subscribers')
          .upsert({ 
            user_id: userId,
            email: profile?.email || '',
            subscribed: true,
            subscription_tier: 'premium',
            is_trial_active: false
          });
        if (error) throw error;
      } else if (action === 'deactivate') {
        const { error } = await supabase
          .from('subscribers')
          .update({ 
            subscribed: false,
            is_trial_active: false
          })
          .eq('user_id', userId);
        if (error) throw error;
      } else if (action === 'trial') {
        // Get user email for subscribers table
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
          
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial
        
        const { error } = await supabase
          .from('subscribers')
          .upsert({ 
            user_id: userId,
            email: profile?.email || '',
            subscribed: false,
            is_trial_active: true,
            trial_end: trialEnd.toISOString()
          });
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
    updateUserRole,
    deleteUser,
    updateSubscription
  };
};
