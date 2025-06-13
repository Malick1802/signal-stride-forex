
import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSystemHealthMonitor = () => {
  const { toast } = useToast();
  const [systemHealth, setSystemHealth] = useState({
    pureOutcomeActive: true,
    signalsHealthy: true,
    timeBasedEliminanted: true
  });

  const verifySystemHealth = useCallback(async () => {
    try {
      console.log('🔍 SYSTEM HEALTH CHECK: Verifying pure outcome system...');

      // Check if we have any signals that are very old but still active (should be fine now)
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('id, symbol, created_at, status')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError) {
        console.error('❌ Error checking system health:', signalsError);
        return;
      }

      const signalsCount = activeSignals?.length || 0;
      console.log(`📊 HEALTH CHECK: ${signalsCount} active signals running on pure outcome monitoring`);

      // Check for very old active signals (which is now OK since no time limits)
      const veryOldSignals = activeSignals?.filter(signal => {
        const hoursActive = (Date.now() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60);
        return hoursActive > 24; // More than 24 hours (previously would have been expired)
      }) || [];

      if (veryOldSignals.length > 0) {
        console.log(`✅ HEALTH CHECK: ${veryOldSignals.length} signals running >24h - PURE OUTCOME SYSTEM WORKING`);
        toast({
          title: "Pure Outcome System Active",
          description: `${veryOldSignals.length} signals running beyond old time limits - market-based expiration only`,
          duration: 4000,
        });
      }

      // Check for recent expired signals to verify they have outcomes
      const { data: recentExpired, error: expiredError } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          created_at,
          signal_outcomes(id, hit_target, notes)
        `)
        .eq('status', 'expired')
        .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours
        .limit(10);

      if (!expiredError && recentExpired) {
        const expiredWithoutOutcomes = recentExpired.filter(s => !s.signal_outcomes || s.signal_outcomes.length === 0);
        
        if (expiredWithoutOutcomes.length === 0) {
          console.log('✅ HEALTH CHECK: All recent expired signals have proper outcomes - pure system working');
          setSystemHealth(prev => ({ ...prev, pureOutcomeActive: true, signalsHealthy: true }));
        } else {
          console.warn(`⚠️ HEALTH CHECK: ${expiredWithoutOutcomes.length} recent signals expired without outcomes`);
        }
      }

    } catch (error) {
      console.error('❌ System health check error:', error);
    }
  }, [toast]);

  useEffect(() => {
    // Initial health check
    verifySystemHealth();

    // Periodic health monitoring every 10 minutes
    const healthInterval = setInterval(verifySystemHealth, 10 * 60 * 1000);

    // Subscribe to signal status changes for immediate health monitoring
    const signalChannel = supabase
      .channel('system-health-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trading_signals',
          filter: 'status=eq.expired'
        },
        (payload) => {
          console.log('🔍 HEALTH MONITOR: Signal expired, verifying outcome exists...', payload.new?.id);
          // Check health after a signal expires
          setTimeout(verifySystemHealth, 2000);
        }
      )
      .subscribe();

    console.log('🛡️ System health monitoring initialized - verifying pure outcome system');

    return () => {
      clearInterval(healthInterval);
      supabase.removeChannel(signalChannel);
    };
  }, [verifySystemHealth]);

  return {
    systemHealth,
    verifySystemHealth
  };
};
