
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExpiredSignal {
  id: string;
  pair: string;
  type: string;
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  takeProfit: string;
  confidence: number;
  result: 'WIN' | 'LOSS';
  pnl: string;
  duration: string;
  expiredAt: string;
  reason: string;
  targetHitLevel?: number;
}

interface ExpiredSignalsStats {
  totalSignals: number;
  winRate: number;
  totalPnL: number;
  avgDuration: string;
  wins: number;
  losses: number;
}

export const useExpiredSignals = () => {
  const [expiredSignals, setExpiredSignals] = useState<ExpiredSignal[]>([]);
  const [stats, setStats] = useState<ExpiredSignalsStats>({
    totalSignals: 0,
    winRate: 0,
    totalPnL: 0,
    avgDuration: '0h 0m',
    wins: 0,
    losses: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchExpiredSignals = async () => {
    try {
      console.log('Fetching expired signals...');
      
      // Fetch signals that have actual outcomes (either hit SL or TP)
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select(`
          *,
          signal_outcomes (
            hit_target,
            exit_price,
            exit_timestamp,
            target_hit_level,
            pnl_pips
          )
        `)
        .not('signal_outcomes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching expired signals:', error);
        toast({
          title: "Database Error",
          description: "Failed to fetch expired signals",
          variant: "destructive"
        });
        return;
      }

      if (signals) {
        console.log(`Found ${signals.length} expired signals with outcomes`);
        
        // Transform the data
        const transformedSignals = signals.map(signal => {
          const outcome = signal.signal_outcomes?.[0];
          const createdAt = new Date(signal.created_at);
          const expiredAt = outcome?.exit_timestamp ? 
            new Date(outcome.exit_timestamp) : 
            new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

          // Calculate duration
          const durationMs = expiredAt.getTime() - createdAt.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

          // Determine result and reason based on actual outcome
          let result: 'WIN' | 'LOSS' = 'LOSS';
          let reason = 'Stop Loss Hit';
          let exitPrice = signal.price;
          let pnl = '$0.00';

          if (outcome) {
            if (outcome.hit_target) {
              result = 'WIN';
              const targetLevel = outcome.target_hit_level || 1;
              if (targetLevel === signal.take_profits?.length) {
                reason = 'All Take Profits Hit';
              } else {
                reason = `Take Profit ${targetLevel} Hit`;
              }
            } else {
              result = 'LOSS';
              reason = 'Stop Loss Hit';
            }
            
            exitPrice = outcome.exit_price || signal.price;
            
            // Calculate P&L based on actual pips
            if (outcome.pnl_pips) {
              const pipValue = 10; // $10 per pip for standard lot
              const pnlAmount = outcome.pnl_pips * pipValue;
              pnl = pnlAmount >= 0 ? `+$${pnlAmount.toFixed(2)}` : `-$${Math.abs(pnlAmount).toFixed(2)}`;
            }
          }

          return {
            id: signal.id,
            pair: signal.symbol || 'Unknown',
            type: signal.type || 'BUY',
            entryPrice: parseFloat(signal.price.toString()).toFixed(5),
            exitPrice: parseFloat(exitPrice.toString()).toFixed(5),
            stopLoss: parseFloat(signal.stop_loss.toString()).toFixed(5),
            takeProfit: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
            confidence: Math.floor(signal.confidence || 0),
            result,
            pnl,
            duration: `${hours}h ${minutes}m`,
            expiredAt: expiredAt.toLocaleString(),
            reason,
            targetHitLevel: outcome?.target_hit_level
          };
        });

        setExpiredSignals(transformedSignals);

        // Calculate statistics
        const totalSignals = transformedSignals.length;
        const wins = transformedSignals.filter(s => s.result === 'WIN').length;
        const losses = transformedSignals.filter(s => s.result === 'LOSS').length;
        const winRate = totalSignals > 0 ? Math.round((wins / totalSignals) * 100) : 0;
        
        // Calculate total P&L
        const totalPnL = transformedSignals.reduce((sum, signal) => {
          const pnlValue = parseFloat(signal.pnl.replace(/[$+,]/g, ''));
          return sum + (isNaN(pnlValue) ? 0 : pnlValue);
        }, 0);

        // Calculate average duration
        const totalDurationMs = transformedSignals.reduce((sum, signal) => {
          const [hours, minutes] = signal.duration.split(' ').map(part => parseInt(part));
          return sum + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
        }, 0);
        const avgDurationMs = totalSignals > 0 ? totalDurationMs / totalSignals : 0;
        const avgHours = Math.floor(avgDurationMs / (1000 * 60 * 60));
        const avgMinutes = Math.floor((avgDurationMs % (1000 * 60 * 60)) / (1000 * 60));

        setStats({
          totalSignals,
          winRate,
          totalPnL,
          avgDuration: `${avgHours}h ${avgMinutes}m`,
          wins,
          losses
        });

        toast({
          title: "Expired Signals Loaded",
          description: `Loaded ${totalSignals} completed signals`,
        });
      }
    } catch (error) {
      console.error('Error fetching expired signals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expired signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiredSignals();
    
    // Set up real-time subscription for new signal outcomes
    const channel = supabase
      .channel('signal-outcomes-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          console.log('New signal outcome:', payload);
          fetchExpiredSignals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    expiredSignals,
    stats,
    loading,
    refetch: fetchExpiredSignals
  };
};
