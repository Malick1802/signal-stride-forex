// Mobile-optimized signal monitoring for immediate TP/SL processing
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import Logger from '@/utils/logger';

interface MobileSignalData {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  take_profits: number[];
  targetsHit: number[];
  status: string;
  current_price?: number;
}

export const useMobileSignalMonitoring = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendStopLossSMS, sendSignalCompleteSMS } = useSMSNotifications();
  const { profile } = useProfile();
  const { 
    sendStopLossNotification, 
    sendSignalCompleteNotification 
  } = useMobileNotificationManager();
  
  const isMonitoringRef = useRef(false);
  const lastCheckRef = useRef(Date.now());

  const processSignalOutcome = useCallback(async (signal: MobileSignalData, currentPrice: number) => {
    try {
      const entryPrice = signal.entryPrice;
      const stopLoss = signal.stopLoss;
      const takeProfits = signal.take_profits.filter(tp => tp > 0); // Filter out null/zero targets
      const targetsHit = signal.targetsHit || [];
      
      let outcomeProcessed = false;
      
      // Check for stop loss hit with immediate processing
      if (signal.type === 'BUY' && currentPrice <= stopLoss) {
        Logger.info('mobile-monitoring', `IMMEDIATE: Stop loss hit for ${signal.symbol} - current: ${currentPrice}, SL: ${stopLoss}`);
        
        // Calculate loss pips
        const pipValue = signal.symbol.includes('JPY') ? 0.01 : 0.0001;
        const lossPips = Math.round((entryPrice - currentPrice) / pipValue);
        
        // Expire signal immediately
        await supabase
          .from('trading_signals')
          .update({ 
            status: 'expired', 
            expire_reason: 'stop_loss_hit',
            current_price: currentPrice,
            current_pips: -Math.abs(lossPips)
          })
          .eq('id', signal.id);
        
        // Create outcome record
        await supabase
          .from('signal_outcomes')
          .insert({
            signal_id: signal.id,
            hit_target: false,
            exit_price: currentPrice,
            pnl_pips: -Math.abs(lossPips),
            notes: 'Mobile monitoring: Stop loss hit',
            processed_by: 'mobile_monitor'
          });
        
        // Send notifications
        if (profile?.phone_number) {
          await sendStopLossSMS(profile.phone_number, {
            symbol: signal.symbol,
            type: signal.type,
            price: currentPrice,
            pnlPips: -Math.abs(lossPips)
          });
        }
        await sendStopLossNotification({
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type
        }, -Math.abs(lossPips));
        
        toast({
          title: "Stop Loss Hit",
          description: `${signal.symbol}: -${Math.abs(lossPips)} pips`,
          variant: "destructive",
        });
        
        outcomeProcessed = true;
      } else if (signal.type === 'SELL' && currentPrice >= stopLoss) {
        Logger.info('mobile-monitoring', `IMMEDIATE: Stop loss hit for ${signal.symbol} - current: ${currentPrice}, SL: ${stopLoss}`);
        
        const pipValue = signal.symbol.includes('JPY') ? 0.01 : 0.0001;
        const lossPips = Math.round((currentPrice - entryPrice) / pipValue);
        
        await supabase
          .from('trading_signals')
          .update({ 
            status: 'expired', 
            expire_reason: 'stop_loss_hit',
            current_price: currentPrice,
            current_pips: -Math.abs(lossPips)
          })
          .eq('id', signal.id);
        
        await supabase
          .from('signal_outcomes')
          .insert({
            signal_id: signal.id,
            hit_target: false,
            exit_price: currentPrice,
            pnl_pips: -Math.abs(lossPips),
            notes: 'Mobile monitoring: Stop loss hit',
            processed_by: 'mobile_monitor'
          });
        
        if (profile?.phone_number) {
          await sendStopLossSMS(profile.phone_number, {
            symbol: signal.symbol,
            type: signal.type,
            price: currentPrice,
            pnlPips: -Math.abs(lossPips)
          });
        }
        await sendStopLossNotification({
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type
        }, -Math.abs(lossPips));
        
        toast({
          title: "Stop Loss Hit",
          description: `${signal.symbol}: -${Math.abs(lossPips)} pips`,
          variant: "destructive",
        });
        
        outcomeProcessed = true;
      }
      
      // Check for take profit hits (only process if stop loss wasn't hit)
      if (!outcomeProcessed && takeProfits.length > 0) {
        const newTargetsHit = [...targetsHit];
        let allTargetsHit = false;
        
        for (let i = 0; i < takeProfits.length; i++) {
          if (newTargetsHit.includes(i + 1)) continue; // Already hit
          
          const targetPrice = takeProfits[i];
          let targetHit = false;
          
          if (signal.type === 'BUY' && currentPrice >= targetPrice) {
            targetHit = true;
          } else if (signal.type === 'SELL' && currentPrice <= targetPrice) {
            targetHit = true;
          }
          
          if (targetHit) {
            newTargetsHit.push(i + 1);
            Logger.info('mobile-monitoring', `IMMEDIATE: Target ${i + 1} hit for ${signal.symbol} at ${currentPrice}`);
          }
        }
        
        // Check if all targets are now hit
        allTargetsHit = newTargetsHit.length === takeProfits.length;
        
        if (allTargetsHit) {
          Logger.info('mobile-monitoring', `IMMEDIATE: All targets hit for ${signal.symbol}`);
          
          const pipValue = signal.symbol.includes('JPY') ? 0.01 : 0.0001;
          const finalTargetPrice = takeProfits[takeProfits.length - 1];
          const profitPips = signal.type === 'BUY' 
            ? Math.round((finalTargetPrice - entryPrice) / pipValue)
            : Math.round((entryPrice - finalTargetPrice) / pipValue);
          
          // Expire signal immediately
          await supabase
            .from('trading_signals')
            .update({ 
              status: 'expired', 
              expire_reason: 'all_take_profits_hit',
              targets_hit: newTargetsHit,
              current_price: currentPrice,
              current_pips: profitPips
            })
            .eq('id', signal.id);
          
          // Create outcome record
          await supabase
            .from('signal_outcomes')
            .insert({
              signal_id: signal.id,
              hit_target: true,
              exit_price: finalTargetPrice,
              target_hit_level: takeProfits.length,
              pnl_pips: profitPips,
              notes: 'Mobile monitoring: All targets hit',
              processed_by: 'mobile_monitor'
            });
          
          // Send notifications
          if (profile?.phone_number) {
            await sendSignalCompleteSMS(profile.phone_number, {
              symbol: signal.symbol,
              type: signal.type,
              price: finalTargetPrice,
              pnlPips: profitPips,
              targetLevel: takeProfits.length
            });
          }
          await sendSignalCompleteNotification({
            id: signal.id,
            symbol: signal.symbol,
            type: signal.type
          }, "profit", profitPips);
          
          toast({
            title: "All Targets Hit!",
            description: `${signal.symbol}: +${profitPips} pips`,
          });
          
          outcomeProcessed = true;
        } else if (newTargetsHit.length > targetsHit.length) {
          // Update targets hit (but don't expire signal yet)
          await supabase
            .from('trading_signals')
            .update({ 
              targets_hit: newTargetsHit,
              current_price: currentPrice
            })
            .eq('id', signal.id);
        }
      }
      
      return outcomeProcessed;
    } catch (error) {
      Logger.error('mobile-monitoring', 'Error processing signal outcome:', error);
      return false;
    }
  }, [toast, sendStopLossSMS, sendSignalCompleteSMS, sendStopLossNotification, sendSignalCompleteNotification, profile]);

  const monitorActiveSignals = useCallback(async () => {
    if (isMonitoringRef.current) return;
    if (Date.now() - lastCheckRef.current < 1500) return; // Throttle to 1.5 seconds
    
    isMonitoringRef.current = true;
    lastCheckRef.current = Date.now();
    
    try {
      // Fetch active signals
      const { data: signals, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .eq('is_centralized', true);
      
      if (signalsError || !signals?.length) {
        return;
      }
      
      // Fetch current market prices
      const symbols = [...new Set(signals.map(s => s.symbol))];
      const { data: marketData, error: marketError } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);
      
      if (marketError || !marketData?.length) {
        return;
      }
      
      // Create price map
      const priceMap = new Map(marketData.map(m => [m.symbol, m.current_price]));
      
      // Process each signal for immediate TP/SL detection
      const processingPromises = signals.map(async (signal) => {
        const currentPrice = priceMap.get(signal.symbol);
        if (!currentPrice || !signal.take_profits?.length) return;
        
        const mobileSignal: MobileSignalData = {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type as 'BUY' | 'SELL',
          entryPrice: parseFloat(signal.price?.toString() || '0'),
          stopLoss: parseFloat(signal.stop_loss?.toString() || '0'),
          take_profits: signal.take_profits?.filter((tp: number) => tp > 0) || [], // Filter out null/zero
          targetsHit: signal.targets_hit || [],
          status: signal.status,
          current_price: currentPrice
        };
        
        return processSignalOutcome(mobileSignal, currentPrice);
      });
      
      await Promise.all(processingPromises);
      
    } catch (error) {
      Logger.error('mobile-monitoring', 'Error in mobile signal monitoring:', error);
    } finally {
      isMonitoringRef.current = false;
    }
  }, [processSignalOutcome]);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    
    Logger.info('mobile-monitoring', 'Starting mobile signal monitoring for immediate TP/SL processing...');
    
    // Initial check
    monitorActiveSignals();
    
    // Set up aggressive monitoring for immediate processing
    const interval = setInterval(monitorActiveSignals, 2000); // Every 2 seconds
    
    // Subscribe to real-time market updates for instant reactions
    const marketChannel = supabase
      .channel('mobile_market_monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centralized_market_state'
        },
        () => {
          // Immediate check when market data updates
          setTimeout(monitorActiveSignals, 100);
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(marketChannel);
      Logger.info('mobile-monitoring', 'Mobile signal monitoring stopped');
    };
  }, [user, monitorActiveSignals]);

  return {
    monitorActiveSignals,
    isMonitoring: isMonitoringRef.current
  };
};