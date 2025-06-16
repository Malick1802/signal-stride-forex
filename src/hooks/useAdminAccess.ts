
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const useAdminAccess = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['admin-access', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      console.log('useAdminAccess: Checking admin access for user:', user.email);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('useAdminAccess: Error checking admin role:', error);
        return false;
      }

      const hasAdminRole = !!data;
      console.log('useAdminAccess: User has admin role:', hasAdminRole);
      return hasAdminRole;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    isAdmin: isAdmin || false,
    isLoading,
  };
};
