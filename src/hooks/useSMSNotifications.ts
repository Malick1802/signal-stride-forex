
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SMSNotificationData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price?: number;
  stopLoss?: number;
  takeProfits?: number[];
  targetLevel?: number;
  pnlPips?: number;
  confidence?: number;
}

export const useSMSNotifications = () => {
  const { user } = useAuth();

  const sendSMS = useCallback(async (
    phoneNumber: string,
    message: string,
    notificationType: 'new_signal' | 'target_hit' | 'stop_loss' | 'signal_complete'
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message,
          type: notificationType,
          userId: user.id
        }
      });

      if (error) {
        console.error('❌ SMS function error:', error);
        return false;
      }

      console.log('✅ SMS notification sent:', data);
      return true;
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      return false;
    }
  }, [user]);

  const sendNewSignalSMS = useCallback(async (
    phoneNumber: string,
    data: SMSNotificationData
  ) => {
    const message = `🚨 NEW SIGNAL: ${data.symbol} ${data.type} at ${data.price?.toFixed(5)} | SL: ${data.stopLoss?.toFixed(5)} | TP1: ${data.takeProfits?.[0]?.toFixed(5)} | Confidence: ${data.confidence}%`;
    return await sendSMS(phoneNumber, message, 'new_signal');
  }, [sendSMS]);

  const sendTargetHitSMS = useCallback(async (
    phoneNumber: string,
    data: SMSNotificationData
  ) => {
    const message = `🎯 TARGET ${data.targetLevel} HIT: ${data.symbol} ${data.type} reached TP${data.targetLevel} at ${data.price?.toFixed(5)} (${data.pnlPips >= 0 ? '+' : ''}${data.pnlPips} pips)`;
    return await sendSMS(phoneNumber, message, 'target_hit');
  }, [sendSMS]);

  const sendStopLossSMS = useCallback(async (
    phoneNumber: string,
    data: SMSNotificationData
  ) => {
    const message = `⛔ STOP LOSS: ${data.symbol} ${data.type} stopped at ${data.price?.toFixed(5)} (${data.pnlPips >= 0 ? '+' : ''}${data.pnlPips} pips)`;
    return await sendSMS(phoneNumber, message, 'stop_loss');
  }, [sendSMS]);

  const sendSignalCompleteSMS = useCallback(async (
    phoneNumber: string,
    data: SMSNotificationData
  ) => {
    const message = `✅ COMPLETE: ${data.symbol} ${data.type} all targets hit (${data.pnlPips >= 0 ? '+' : ''}${data.pnlPips} pips total)`;
    return await sendSMS(phoneNumber, message, 'signal_complete');
  }, [sendSMS]);

  return {
    sendNewSignalSMS,
    sendTargetHitSMS,
    sendStopLossSMS,
    sendSignalCompleteSMS
  };
};
