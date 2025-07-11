
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePhoneVerification = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

  const sendVerificationCode = useCallback(async (phoneNumber: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-sms', {
        body: { phoneNumber }
      });

      if (error) {
        console.error('❌ Error sending verification code:', error);
        return { success: false, error: 'Failed to send verification code' };
      }

      console.log('✅ Verification code sent:', data);
      
      // Start cooldown timer (60 seconds)
      setCooldownTime(60);
      const interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending verification code:', error);
      return { success: false, error: 'Failed to send verification code' };
    } finally {
      setIsSending(false);
    }
  }, [user]);

  const verifyPhoneNumber = useCallback(async (phoneNumber: string, verificationCode: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-number', {
        body: { phoneNumber, verificationCode }
      });

      if (error) {
        console.error('❌ Error verifying phone number:', error);
        return { success: false, error: error.message || 'Failed to verify phone number' };
      }

      console.log('✅ Phone number verified:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error verifying phone number:', error);
      return { success: false, error: 'Failed to verify phone number' };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    sendVerificationCode,
    verifyPhoneNumber,
    isLoading,
    isSending,
    cooldownTime
  };
};
