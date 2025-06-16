
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReferralTracking = () => {
  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    if (referralCode) {
      // Store referral code in localStorage for later use
      localStorage.setItem('referralCode', referralCode);
      
      // Track the click event
      trackReferralEvent(referralCode, 'click');
      
      // Clean URL without refreshing
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const trackReferralEvent = async (referralCode: string, eventType: string, userId?: string) => {
    try {
      const { error } = await supabase.functions.invoke('track-referral', {
        body: {
          referralCode,
          eventType,
          userId,
          ipAddress: null, // Browser can't access real IP
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          utmSource: new URLSearchParams(window.location.search).get('utm_source'),
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign')
        }
      });

      if (error) {
        console.error('Error tracking referral:', error);
      } else {
        console.log(`Tracked ${eventType} for referral code: ${referralCode}`);
      }
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const trackSignup = async (userId: string) => {
    const referralCode = localStorage.getItem('referralCode');
    if (referralCode) {
      await trackReferralEvent(referralCode, 'signup', userId);
    }
  };

  const trackSubscription = async (userId: string, subscriptionAmount: number) => {
    const referralCode = localStorage.getItem('referralCode');
    if (referralCode) {
      await trackReferralEvent(referralCode, 'subscription', userId);
      
      // Trigger commission distribution
      try {
        await supabase.rpc('distribute_mlm_commission', {
          referral_user_id: userId,
          subscription_amount: subscriptionAmount,
          commission_type: 'signup_bonus'
        });
      } catch (error) {
        console.error('Error distributing commission:', error);
      }
      
      // Clear the referral code after successful conversion
      localStorage.removeItem('referralCode');
    }
  };

  return {
    trackSignup,
    trackSubscription,
    trackReferralEvent
  };
};
