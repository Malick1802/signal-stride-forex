
import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PerformanceStats {
  totalSignals: number;
  completedSignals: number;
  winRate: number;
  totalPips: number;
  avgPipsPerWin: number;
  avgPipsPerLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  bestDay: number;
  worstDay: number;
}

export const usePerformanceNotifications = () => {
  const { toast } = useToast();
  const [previousStats, setPreviousStats] = useState<PerformanceStats | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<Record<string, number>>({});

  // Prevent notification spam by checking time since last notification
  const shouldNotify = useCallback((notificationType: string, minIntervalMinutes: number = 5): boolean => {
    const now = Date.now();
    const lastTime = lastNotificationTime[notificationType] || 0;
    const minInterval = minIntervalMinutes * 60 * 1000;
    
    if (now - lastTime >= minInterval) {
      setLastNotificationTime(prev => ({ ...prev, [notificationType]: now }));
      return true;
    }
    return false;
  }, [lastNotificationTime]);

  const calculatePerformanceStats = useCallback(async (): Promise<PerformanceStats | null> => {
    try {
      // Get all completed signals from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: outcomes, error } = await supabase
        .from('signal_outcomes')
        .select('*')
        .gte('exit_timestamp', thirtyDaysAgo.toISOString())
        .order('exit_timestamp', { ascending: true });

      if (error || !outcomes) {
        return null;
      }

      const totalSignals = outcomes.length;
      if (totalSignals === 0) return null;

      const wins = outcomes.filter(o => o.hit_target);
      const losses = outcomes.filter(o => !o.hit_target);
      
      const winRate = Math.round((wins.length / totalSignals) * 100);
      const totalPips = outcomes.reduce((sum, o) => sum + (o.pnl_pips || 0), 0);
      
      const avgPipsPerWin = wins.length > 0 
        ? Math.round(wins.reduce((sum, o) => sum + (o.pnl_pips || 0), 0) / wins.length)
        : 0;
      
      const avgPipsPerLoss = losses.length > 0 
        ? Math.round(Math.abs(losses.reduce((sum, o) => sum + (o.pnl_pips || 0), 0)) / losses.length)
        : 0;

      // Calculate consecutive streaks
      let consecutiveWins = 0;
      let consecutiveLosses = 0;
      let currentWinStreak = 0;
      let currentLossStreak = 0;

      for (const outcome of outcomes.reverse()) { // Start from most recent
        if (outcome.hit_target) {
          currentWinStreak++;
          currentLossStreak = 0;
          consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
        } else {
          currentLossStreak++;
          currentWinStreak = 0;
          consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
        }
      }

      // Calculate best and worst day
      const dailyResults: Record<string, number> = {};
      outcomes.forEach(outcome => {
        const day = outcome.exit_timestamp.split('T')[0];
        dailyResults[day] = (dailyResults[day] || 0) + (outcome.pnl_pips || 0);
      });

      const dailyPips = Object.values(dailyResults);
      const bestDay = dailyPips.length > 0 ? Math.max(...dailyPips) : 0;
      const worstDay = dailyPips.length > 0 ? Math.min(...dailyPips) : 0;

      return {
        totalSignals,
        completedSignals: totalSignals,
        winRate,
        totalPips,
        avgPipsPerWin,
        avgPipsPerLoss,
        consecutiveWins,
        consecutiveLosses,
        bestDay,
        worstDay
      };

    } catch (error) {
      console.error('Error calculating performance stats:', error);
      return null;
    }
  }, []);

  const checkPerformanceMilestones = useCallback(async () => {
    const currentStats = await calculatePerformanceStats();
    if (!currentStats) return;

    // Compare with previous stats to detect changes
    if (previousStats) {
      // Win rate milestones
      if (currentStats.winRate >= 80 && previousStats.winRate < 80 && shouldNotify('winRate80', 60)) {
        toast({
          title: "🏆 Elite Performance!",
          description: `Achieved 80%+ win rate (${currentStats.winRate}%) over ${currentStats.completedSignals} signals`,
          duration: 10000,
        });
      } else if (currentStats.winRate >= 70 && previousStats.winRate < 70 && shouldNotify('winRate70', 30)) {
        toast({
          title: "📈 Strong Performance!",
          description: `Achieved 70%+ win rate (${currentStats.winRate}%) - excellent trading`,
          duration: 8000,
        });
      }

      // Pip milestones
      if (currentStats.totalPips >= 500 && previousStats.totalPips < 500 && shouldNotify('pips500', 120)) {
        toast({
          title: "💰 Major Milestone!",
          description: `Reached +${currentStats.totalPips} total pips! Outstanding performance`,
          duration: 12000,
        });
      } else if (currentStats.totalPips >= 250 && previousStats.totalPips < 250 && shouldNotify('pips250', 60)) {
        toast({
          title: "🎯 Great Achievement!",
          description: `Reached +${currentStats.totalPips} total pips across ${currentStats.completedSignals} signals`,
          duration: 8000,
        });
      } else if (currentStats.totalPips >= 100 && previousStats.totalPips < 100 && shouldNotify('pips100', 30)) {
        toast({
          title: "📊 Profit Milestone!",
          description: `Achieved +${currentStats.totalPips} total pips - keep up the great work!`,
          duration: 6000,
        });
      }

      // Consecutive wins
      if (currentStats.consecutiveWins >= 5 && previousStats.consecutiveWins < 5 && shouldNotify('consecutiveWins5', 30)) {
        toast({
          title: "🔥 Hot Streak!",
          description: `${currentStats.consecutiveWins} consecutive wins! You're on fire!`,
          duration: 8000,
        });
      } else if (currentStats.consecutiveWins >= 3 && previousStats.consecutiveWins < 3 && shouldNotify('consecutiveWins3', 15)) {
        toast({
          title: "⚡ Winning Streak!",
          description: `${currentStats.consecutiveWins} wins in a row - momentum building!`,
          duration: 6000,
        });
      }

      // Risk management alerts (consecutive losses)
      if (currentStats.consecutiveLosses >= 3 && previousStats.consecutiveLosses < 3 && shouldNotify('consecutiveLoss3', 15)) {
        toast({
          title: "⚠️ Risk Alert",
          description: `${currentStats.consecutiveLosses} consecutive losses - consider reviewing strategy`,
          duration: 8000,
        });
      }

      // Daily performance alerts
      if (currentStats.bestDay >= 50 && previousStats.bestDay < 50 && shouldNotify('bestDay50', 120)) {
        toast({
          title: "🌟 Best Day Ever!",
          description: `New personal record: +${currentStats.bestDay} pips in a single day!`,
          duration: 10000,
        });
      }

      // Weekly performance summaries (only on Sunday evenings)
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() >= 20 && shouldNotify('weeklyStats', 10080)) { // 7 days
        toast({
          title: "📊 Weekly Summary",
          description: `This week: ${currentStats.winRate}% win rate, ${currentStats.totalPips >= 0 ? '+' : ''}${currentStats.totalPips} pips, ${currentStats.completedSignals} signals completed`,
          duration: 10000,
        });
      }
    }

    setPreviousStats(currentStats);
  }, [previousStats, calculatePerformanceStats, shouldNotify, toast]);

  useEffect(() => {
    // Initial calculation
    checkPerformanceMilestones();

    // Check performance every 5 minutes
    const performanceInterval = setInterval(checkPerformanceMilestones, 5 * 60 * 1000);

    // Subscribe to signal outcomes for immediate performance updates
    const outcomesChannel = supabase
      .channel('performance-outcomes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        () => {
          setTimeout(checkPerformanceMilestones, 2000);
        }
      )
      .subscribe();

    console.log('🔄 Performance notifications system activated');

    return () => {
      clearInterval(performanceInterval);
      supabase.removeChannel(outcomesChannel);
    };
  }, [checkPerformanceMilestones]);

  return {
    calculatePerformanceStats,
    checkPerformanceMilestones
  };
};
