
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMarketActivation = () => {
  const activateMarket = useCallback(async () => {
    try {
      console.log('🔄 Activating automated market data system...');
      
      // Check if we have recent market data (within last 2 minutes)
      const { data: existingData, error: checkError } = await supabase
        .from('centralized_market_state')
        .select('last_update, source')
        .order('last_update', { ascending: false })
        .limit(1);
      
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const hasRecentData = existingData && existingData.length > 0 && 
        new Date(existingData[0].last_update) > twoMinutesAgo;
      
      if (hasRecentData) {
        console.log('✅ Recent market data found, automated system active');
        return;
      }
      
      console.log('📊 Centralized market system - relying on 60s FastForex updates');
      console.log('✅ Market activation completed - using centralized data flow');
      
    } catch (error) {
      console.error('💥 Automated market activation error:', error);
    }
  }, []);

  // Auto-activation on system startup for the automated system
  useEffect(() => {
    const activationTimer = setTimeout(() => {
      activateMarket();
    }, 800); // Slight delay for better UX
    
    return () => clearTimeout(activationTimer);
  }, [activateMarket]);

  return { activateMarket };
};
