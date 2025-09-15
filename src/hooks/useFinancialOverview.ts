import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  pendingPayoutCount: number;
  activeSubscribers: number;
}

interface FinancialTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  user_id?: string;
}

interface Commission {
  id: string;
  amount: number;
  level: number;
  commission_type: string;
  status: string;
  created_at: string;
  affiliate_id: string;
}

export const useFinancialOverview = () => {
  // Fetch financial statistics with simplified queries
  const { data: financialStats, isLoading: statsLoading } = useQuery({
    queryKey: ['financial-stats'],
    queryFn: async (): Promise<FinancialStats> => {
      console.log('Fetching financial statistics...');

      // Return empty data since no real transactions exist yet
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingPayouts: 0,
        pendingPayoutCount: 0,
        activeSubscribers: 0,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch recent transactions with simplified approach
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async (): Promise<FinancialTransaction[]> => {
      console.log('Fetching recent transactions...');

      // Return empty array since no real transactions exist yet
      return [];
    },
    refetchInterval: 60000,
  });

  // Fetch recent commissions
  const { data: recentCommissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['recent-commissions'],
    queryFn: async (): Promise<Commission[]> => {
      console.log('Fetching recent commissions...');

      // Return empty array since no real commissions exist yet  
      return [];
    },
    refetchInterval: 60000,
  });

  return {
    financialStats,
    recentTransactions,
    recentCommissions,
    statsLoading,
    transactionsLoading,
    commissionsLoading,
  };
};