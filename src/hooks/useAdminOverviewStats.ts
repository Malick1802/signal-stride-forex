
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminOverviewStats {
  totalUsers: number;
  newUsersToday: number;
  activeSignals: number;
  signalSuccessRate: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  systemHealth: number;
  recentActivity: Array<{
    action: string;
    timestamp: string;
  }>;
  systemAlerts: Array<{
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
}

export const useAdminOverviewStats = () => {
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalUsers: 0,
    newUsersToday: 0,
    activeSignals: 0,
    signalSuccessRate: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    systemHealth: 100,
    recentActivity: [],
    systemAlerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch new users today
      const today = new Date().toISOString().split('T')[0];
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Fetch active signals
      const { count: activeSignals } = await supabase
        .from('trading_signals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Calculate signal success rate
      const { data: outcomes } = await supabase
        .from('signal_outcomes')
        .select('hit_target');
      
      const successRate = outcomes?.length ? 
        Math.round((outcomes.filter(o => o.hit_target).length / outcomes.length) * 100) : 0;

      // Mock data for revenue and other metrics
      const monthlyRevenue = 15750;
      const revenueGrowth = 12;
      const systemHealth = 98;

      // Recent activity
      const recentActivity = [
        { action: 'New user registration', timestamp: '2 minutes ago' },
        { action: 'Signal generated for EUR/USD', timestamp: '5 minutes ago' },
        { action: 'Affiliate payout processed', timestamp: '15 minutes ago' },
        { action: 'System backup completed', timestamp: '1 hour ago' }
      ];

      // System alerts
      const systemAlerts = [
        { message: 'API rate limit approaching for market data', severity: 'medium' as const, timestamp: '30 minutes ago' },
        { message: 'Database connection pool at 85% capacity', severity: 'low' as const, timestamp: '1 hour ago' }
      ];

      setStats({
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        activeSignals: activeSignals || 0,
        signalSuccessRate: successRate,
        monthlyRevenue,
        revenueGrowth,
        systemHealth,
        recentActivity,
        systemAlerts
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchAdminStats };
};
