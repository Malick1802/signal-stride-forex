
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
      console.log('📊 Fetching outcome-based expired signals...');
      
      // Fetch signals that have actual outcomes recorded
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select(`
          *,
          signal_outcomes (
            hit_target,
            exit_price,
            exit_timestamp,
            target_hit_level,
            pnl_pips,
            notes
          )
        `)
        .eq('status', 'expired')
        .not('signal_outcomes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error fetching expired signals:', error);
        toast({
          title: "Database Error",
          description: "Failed to fetch expired signals",
          variant: "destructive"
        });
        return;
      }

      if (signals) {
        console.log(`📈 Found ${signals.length} outcome-based expired signals`);
        
        // Transform the data
        const transformedSignals = signals.map(signal => {
          const outcome = signal.signal_outcomes?.[0];
          const createdAt = new Date(signal.created_at);
          const expiredAt = outcome?.exit_timestamp ? 
            new Date(outcome.exit_timestamp) : 
            new Date();

          // Calculate duration from creation to outcome
          const durationMs = expiredAt.getTime() - createdAt.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

          // Determine result based on actual outcome
          let result: 'WIN' | 'LOSS' = 'LOSS';
          let reason = 'Stop Loss Hit';
          let exitPrice = signal.price;
          let pnl = '$0.00';

          if (outcome) {
            if (outcome.hit_target) {
              result = 'WIN';
              reason = outcome.notes || `Take Profit Hit`;
            } else {
              result = 'LOSS';
              reason = outcome.notes || 'Stop Loss Hit';
            }
            
            exitPrice = outcome.exit_price || signal.price;
            
            // Calculate P&L based on actual pips with enhanced calculation
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

        // Calculate enhanced statistics
        const totalSignals = transformedSignals.length;
        const wins = transformedSignals.filter(s => s.result === 'WIN').length;
        const losses = transformedSignals.filter(s => s.result === 'LOSS').length;
        const winRate = totalSignals > 0 ? Math.round((wins / totalSignals) * 100) : 0;
        
        // Calculate total P&L with better parsing
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

        console.log(`✅ Loaded ${totalSignals} outcome-based expired signals - Win Rate: ${winRate}%, Total P&L: $${totalPnL.toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ Error fetching expired signals:', error);
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
    
    // Enhanced real-time subscriptions for immediate updates
    const outcomesChannel = supabase
      .channel('expired-signals-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          console.log('📡 New signal outcome detected:', payload);
          // Immediate refresh when new outcomes are created
          setTimeout(fetchExpiredSignals, 500);
          
          toast({
            title: "📊 Signal Completed",
            description: "A new signal outcome has been recorded",
            duration: 3000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trading_signals',
          filter: 'status=eq.expired'
        },
        (payload) => {
          console.log('📡 Signal expired:', payload);
          setTimeout(fetchExpiredSignals, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(outcomesChannel);
    };
  }, []);

  return {
    expiredSignals,
    stats,
    loading,
    refetch: fetchExpiredSignals
  };
};
