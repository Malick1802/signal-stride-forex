
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Logger from '@/utils/logger';

export const useSignalStatusManager = () => {
  
  // Force expire signals that have all targets hit but are still active
  const forceExpireCompletedSignals = useCallback(async () => {
    try {
      console.log('🔧 REPAIR: Checking for signals with all targets hit but still active...');
      
      // Get all active signals
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('id, symbol, type, take_profits, targets_hit, created_at')
        .eq('status', 'active')
        .eq('is_centralized', true);

      if (signalsError) {
        console.error('❌ Error fetching active signals:', signalsError);
        return { repaired: 0, total: 0 };
      }

      if (!activeSignals?.length) {
        console.log('✅ No active signals found');
        return { repaired: 0, total: 0 };
      }

      // Find signals that should be expired (all targets hit)
      const signalsToExpire = activeSignals.filter(signal => {
        const takeProfits = signal.take_profits || [];
        const targetsHit = signal.targets_hit || [];
        const allTargetsHit = takeProfits.length > 0 && targetsHit.length === takeProfits.length;
        
        if (allTargetsHit) {
          console.log(`🎯 REPAIR NEEDED: ${signal.symbol} has all ${targetsHit.length} targets hit but is still active`);
          return true;
        }
        return false;
      });

      console.log(`🔧 Found ${signalsToExpire.length} signals needing status repair`);

      let repairedCount = 0;
      
      // Force expire each signal that has all targets hit
      for (const signal of signalsToExpire) {
        try {
          const { error: updateError } = await supabase
            .from('trading_signals')
            .update({ 
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (updateError) {
            console.error(`❌ Failed to expire signal ${signal.id}:`, updateError);
          } else {
            console.log(`✅ REPAIRED: Expired signal ${signal.symbol} (${signal.id})`);
            repairedCount++;
          }
        } catch (error) {
          console.error(`❌ Error expiring signal ${signal.id}:`, error);
        }
      }

      console.log(`🔧 REPAIR COMPLETE: Fixed ${repairedCount} out of ${signalsToExpire.length} signals`);
      
      return { 
        repaired: repairedCount, 
        total: signalsToExpire.length,
        activeSignalsChecked: activeSignals.length
      };

    } catch (error) {
      console.error('❌ Error in force expire process:', error);
      return { repaired: 0, total: 0 };
    }
  }, []);

  // Enhanced signal expiration with immediate status update
  const expireSignalImmediately = useCallback(async (
    signalId: string,
    reason: 'all_targets_hit' | 'stop_loss_hit',
    targetsHit: number[] = []
  ) => {
    try {
      Logger.info('status-manager', `Immediately expiring signal ${signalId}: ${reason}`);
      
      // Always update status to expired, regardless of existing outcomes
      const { error: statusError } = await supabase
        .from('trading_signals')
        .update({ 
          status: 'expired',
          targets_hit: targetsHit,
          updated_at: new Date().toISOString()
        })
        .eq('id', signalId);

      if (statusError) {
        Logger.error('status-manager', `Failed to expire signal ${signalId}:`, statusError);
        return false;
      }

      Logger.info('status-manager', `✅ Signal ${signalId} successfully expired: ${reason}`);
      return true;

    } catch (error) {
      Logger.error('status-manager', `Error expiring signal ${signalId}:`, error);
      return false;
    }
  }, []);

  // Validate signal status consistency
  const validateSignalStatus = useCallback(async (signalId: string) => {
    try {
      const { data: signal, error } = await supabase
        .from('trading_signals')
        .select('id, status, take_profits, targets_hit, symbol')
        .eq('id', signalId)
        .single();

      if (error || !signal) {
        return { isValid: false, reason: 'Signal not found' };
      }

      const takeProfits = signal.take_profits || [];
      const targetsHit = signal.targets_hit || [];
      const allTargetsHit = takeProfits.length > 0 && targetsHit.length === takeProfits.length;

      // Check for inconsistent state
      if (allTargetsHit && signal.status === 'active') {
        return { 
          isValid: false, 
          reason: `Signal ${signal.symbol} has all targets hit but is still active`,
          shouldBeExpired: true
        };
      }

      return { isValid: true, reason: 'Status is consistent' };

    } catch (error) {
      return { isValid: false, reason: `Validation error: ${error}` };
    }
  }, []);

  return {
    forceExpireCompletedSignals,
    expireSignalImmediately,
    validateSignalStatus
  };
};
