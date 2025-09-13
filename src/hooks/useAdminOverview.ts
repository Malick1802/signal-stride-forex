import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminOverviewStats {
  totalUsers: number;
  activeSubscribers: number;
  trialUsers: number;
  totalSignals: number;
  activeSignals: number;
  todaysSignals: number;
  totalRevenue: number;
  monthlyRevenue: number;
  successRate: number;
  systemHealth: {
    signalGeneration: boolean;
    marketData: boolean;
    database: boolean;
    api: boolean;
  };
}

export interface RecentActivity {
  id: string;
  type: 'user_signup' | 'signal_created' | 'subscription' | 'system_event';
  description: string;
  timestamp: string;
  details?: any;
}

export const useAdminOverview = () => {
  // Fetch overview statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async (): Promise<AdminOverviewStats> => {
      console.log('useAdminOverview: Fetching overview stats...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        { count: totalUsers },
        { count: activeSubscribers },
        { count: trialUsers },
        { count: totalSignals },
        { count: activeSignals },
        { count: todaysSignals },
        financialData,
        successfulSignals,
        recentErrors
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscribed', true),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_trial_active', true),
        supabase.from('trading_signals').select('*', { count: 'exact', head: true }),
        supabase.from('trading_signals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('trading_signals').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('financial_transactions').select('amount').eq('status', 'completed'),
        supabase.from('signal_outcomes').select('*', { count: 'exact', head: true }).eq('hit_target', true),
        supabase.from('function_invocations').select('*', { count: 'exact', head: true }).eq('success', false).gte('created_at', todayISO)
      ]);

      // Calculate revenue
      const totalRevenue = financialData.data?.reduce((sum, transaction) => 
        sum + (parseFloat(String(transaction.amount)) || 0), 0) || 0;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: monthlyData } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const monthlyRevenue = monthlyData?.reduce((sum, transaction) => 
        sum + (parseFloat(String(transaction.amount)) || 0), 0) || 0;

      // Calculate success rate
      const successCount = successfulSignals.count || 0;
      const successRate = totalSignals && totalSignals > 0 ? Math.round((successCount / totalSignals) * 100) : 0;

      // System health based on recent errors and activity
      const errorRate = recentErrors.count || 0;
      const systemHealth = {
        signalGeneration: errorRate < 5,
        marketData: true, // Could be enhanced with real market data checks
        database: true, // Could be enhanced with performance metrics
        api: errorRate < 10
      };

      return {
        totalUsers: totalUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        trialUsers: trialUsers || 0,
        totalSignals: totalSignals || 0,
        activeSignals: activeSignals || 0,
        todaysSignals: todaysSignals || 0,
        totalRevenue,
        monthlyRevenue,
        successRate,
        systemHealth
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      console.log('useAdminOverview: Fetching recent activity...');
      
      const activities: RecentActivity[] = [];

      // Recent user signups
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentUsers?.forEach(user => {
        activities.push({
          id: `user-${user.email}`,
          type: 'user_signup',
          description: `New user registered: ${user.email}`,
          timestamp: user.created_at,
        });
      });

      // Recent signals
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('id, symbol, type, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentSignals?.forEach(signal => {
        activities.push({
          id: `signal-${signal.id}`,
          type: 'signal_created',
          description: `${signal.type} signal created for ${signal.symbol}`,
          timestamp: signal.created_at,
        });
      });

      // Recent subscriptions
      const { data: recentSubscriptions } = await supabase
        .from('subscribers')
        .select('id, subscription_tier, created_at, profiles(email)')
        .eq('subscribed', true)
        .order('created_at', { ascending: false })
        .limit(3);

      recentSubscriptions?.forEach(sub => {
        activities.push({
          id: `sub-${sub.id}`,
          type: 'subscription',
          description: `New ${sub.subscription_tier} subscription`,
          timestamp: sub.created_at,
        });
      });

      // Sort by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch function performance metrics
  const { data: functionMetrics } = useQuery({
    queryKey: ['admin-function-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('function_invocations')
        .select('function_name, success, execution_time_ms, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      return data || [];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  return {
    stats,
    statsLoading,
    recentActivity,
    activityLoading,
    functionMetrics
  };
};