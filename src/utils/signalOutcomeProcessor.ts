
import { supabase } from '@/integrations/supabase/client';
import { SignalToMonitor, SignalOutcomeParams } from '@/types/signalMonitoring';

export const checkSignalOutcome = (signal: SignalToMonitor, currentPrice: number) => {
  console.log(`📊 Checking signal ${signal.id} (${signal.symbol}): Current ${currentPrice}, Entry ${signal.entryPrice}`);

  let hitStopLoss = false;
  let hitTarget = false;
  let targetLevel = 0;
  let exitPrice = currentPrice;

  // Check stop loss hit
  if (signal.type === 'BUY') {
    hitStopLoss = currentPrice <= signal.stopLoss;
  } else {
    hitStopLoss = currentPrice >= signal.stopLoss;
  }

  // Check take profit hits
  if (!hitStopLoss && signal.takeProfits.length > 0) {
    for (let i = 0; i < signal.takeProfits.length; i++) {
      const tpPrice = signal.takeProfits[i];
      let tpHit = false;
      
      if (signal.type === 'BUY') {
        tpHit = currentPrice >= tpPrice;
      } else {
        tpHit = currentPrice <= tpPrice;
      }
      
      if (tpHit) {
        hitTarget = true;
        targetLevel = i + 1;
        exitPrice = tpPrice;
      }
    }
  }

  return {
    hasOutcome: hitStopLoss || hitTarget,
    hitTarget,
    hitStopLoss,
    exitPrice,
    targetLevel
  };
};

export const processSignalOutcome = async (params: SignalOutcomeParams) => {
  const { signal, exitPrice, hitTarget, targetLevel } = params;
  
  try {
    console.log(`🎯 Signal outcome detected for ${signal.symbol}: ${hitTarget ? 'TARGET HIT' : 'STOP LOSS HIT'}`);
    
    // Calculate P&L in pips
    let pnlPips = 0;
    if (signal.type === 'BUY') {
      pnlPips = Math.round((exitPrice - signal.entryPrice) * 10000);
    } else {
      pnlPips = Math.round((signal.entryPrice - exitPrice) * 10000);
    }

    // Create signal outcome record
    const { error: outcomeError } = await supabase
      .from('signal_outcomes')
      .insert({
        signal_id: signal.id,
        hit_target: hitTarget,
        exit_price: exitPrice,
        target_hit_level: hitTarget ? targetLevel : null,
        pnl_pips: pnlPips,
        notes: hitTarget ? `Take Profit ${targetLevel} Hit` : 'Stop Loss Hit'
      });

    if (outcomeError) {
      console.error('❌ Error creating signal outcome:', outcomeError);
      return false;
    }

    // Update signal status to expired
    const { error: updateError } = await supabase
      .from('trading_signals')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', signal.id);

    if (updateError) {
      console.error('❌ Error updating signal status:', updateError);
      return false;
    }

    console.log(`✅ Signal ${signal.id} marked as expired with outcome recorded`);
    return { success: true, pnlPips, hitTarget, targetLevel };

  } catch (error) {
    console.error('❌ Error processing signal outcome:', error);
    return false;
  }
};
