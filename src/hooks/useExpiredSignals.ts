
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
  pips: string;
  duration: string;
  expiredAt: string;
  reason: string;
  targetHitLevel?: number;
}

interface ExpiredSignalsStats {
  totalSignals: number;
  winRate: number;
  avgPips: number;
  avgDuration: string;
  wins: number;
  losses: number;
}

export const useExpiredSignals = () => {
  const [expiredSignals, setExpiredSignals] = useState<ExpiredSignal[]>([]);
  const [stats, setStats] = useState<ExpiredSignalsStats>({
    totalSignals: 0,
    winRate: 0,
    avgPips: 0,
    avgDuration: '0h 0m',
    wins: 0,
    losses: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchExpiredSignals = async () => {
    try {
      console.log('📊 Fetching expired signals with outcomes...');
      
      // Fetch expired signals with their outcomes
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
        .order('updated_at', { ascending: false })
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
        console.log(`📈 Found ${signals.length} expired signals`);
        
        // Transform the data using actual outcome data
        const transformedSignals = signals.map(signal => {
          const outcome = signal.signal_outcomes?.[0];
          const createdAt = new Date(signal.created_at);
          
          // Use actual exit timestamp from outcome or signal update time
          let expiredAt: Date;
          if (outcome?.exit_timestamp) {
            expiredAt = new Date(outcome.exit_timestamp);
          } else {
            expiredAt = new Date(signal.updated_at);
          }

          // Calculate actual duration from creation to expiration
          const durationMs = expiredAt.getTime() - createdAt.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

          // Use outcome data if available - PRIORITY LOGIC FIXED
          let result: 'WIN' | 'LOSS' = 'LOSS';
          let reason = 'Unknown';
          let exitPrice = signal.price;
          let pips = '0 pips';
          let targetHitLevel = undefined;

          if (outcome) {
            result = outcome.hit_target ? 'WIN' : 'LOSS';
            exitPrice = outcome.exit_price || signal.price;
            targetHitLevel = outcome.target_hit_level;
            reason = outcome.notes || (outcome.hit_target ? 'Target Hit' : 'Stop Loss Hit');
            
            // Use actual pips from outcome - this should prioritize profit level pips
            if (outcome.pnl_pips !== null && outcome.pnl_pips !== undefined) {
              pips = outcome.pnl_pips >= 0 ? `+${outcome.pnl_pips} pips` : `${outcome.pnl_pips} pips`;
            }
          } else {
            // Fallback: check signal targets_hit and estimate pips - FIXED LOGIC
            const targetsHit = signal.targets_hit || [];
            if (targetsHit.length > 0) {
              // PRIORITY FIX: If targets were hit, calculate pips to the highest hit target
              result = 'WIN';
              targetHitLevel = Math.max(...targetsHit);
              reason = `Target ${targetHitLevel} Hit`;
              
              // Calculate pips to the target that was hit, NOT to stop loss
              const takeProfits = signal.take_profits || [];
              if (takeProfits[targetHitLevel - 1]) {
                const targetPrice = parseFloat(takeProfits[targetHitLevel - 1].toString());
                exitPrice = targetPrice;
                
                const entryPrice = parseFloat(signal.price.toString());
                let pipDifference = 0;
                const multiplier = signal.symbol.includes('JPY') ? 100 : 10000;
                
                // Calculate pips to the TARGET PRICE, not stop loss
                if (signal.type === 'BUY') {
                  pipDifference = Math.round((targetPrice - entryPrice) * multiplier);
                } else {
                  pipDifference = Math.round((entryPrice - targetPrice) * multiplier);
                }
                
                pips = pipDifference >= 0 ? `+${pipDifference} pips` : `${pipDifference} pips`;
              }
            } else {
              // Only calculate stop loss pips if NO targets were hit
              result = 'LOSS';
              reason = 'Stop Loss Hit';
              exitPrice = signal.stop_loss;
              
              // Calculate SL pips
              const entryPrice = parseFloat(signal.price.toString());
              const stopLossPrice = parseFloat(signal.stop_loss.toString());
              const multiplier = signal.symbol.includes('JPY') ? 100 : 10000;
              
              let pipDifference = 0;
              if (signal.type === 'BUY') {
                pipDifference = Math.round((stopLossPrice - entryPrice) * multiplier);
              } else {
                pipDifference = Math.round((entryPrice - stopLossPrice) * multiplier);
              }
              
              pips = `${pipDifference} pips`;
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
            pips,
            duration: `${hours}h ${minutes}m`,
            expiredAt: expiredAt.toLocaleString(),
            reason,
            targetHitLevel
          };
        });

        setExpiredSignals(transformedSignals);

        // Calculate statistics - Average pips now correctly uses profit-level pips when available
        const totalSignals = transformedSignals.length;
        const wins = transformedSignals.filter(s => s.result === 'WIN').length;
        const losses = transformedSignals.filter(s => s.result === 'LOSS').length;
        const winRate = totalSignals > 0 ? Math.round((wins / totalSignals) * 100) : 0;
        
        // Calculate average pips using the corrected pip values
        const totalPips = transformedSignals.reduce((sum, signal) => {
          const pipsValue = parseInt(signal.pips.replace(/[^\d-]/g, ''));
          return sum + (isNaN(pipsValue) ? 0 : pipsValue);
        }, 0);
        const avgPips = totalSignals > 0 ? Math.round(totalPips / totalSignals) : 0;

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
          avgPips,
          avgDuration: `${avgHours}h ${avgMinutes}m`,
          wins,
          losses
        });

        console.log(`✅ Loaded ${totalSignals} expired signals - Wins: ${wins}, Losses: ${losses}, Win Rate: ${winRate}%, Avg Pips: ${avgPips >= 0 ? '+' : ''}${avgPips}`);
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
    
    // Real-time subscriptions for updates
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
          fetchExpiredSignals();
          
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
          fetchExpiredSignals();
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
