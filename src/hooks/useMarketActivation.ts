
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMarketActivation = () => {
  const activateMarket = useCallback(async () => {
    try {
      console.log('🔄 Activating FastForex-powered real-time market system...');
      
      // Check if we have recent FastForex data (within last 2 minutes)
      const { data: existingData, error: checkError } = await supabase
        .from('centralized_market_state')
        .select('last_update, source')
        .order('last_update', { ascending: false })
        .limit(1);
      
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const hasRecentFastForexData = existingData && existingData.length > 0 && 
        new Date(existingData[0].last_update) > twoMinutesAgo &&
        existingData[0].source?.includes('fastforex');
      
      if (hasRecentFastForexData) {
        console.log('✅ Recent FastForex data found, market system active');
        return;
      }
      
      // Initialize fresh FastForex baseline data
      console.log('📊 Initializing fresh FastForex baseline data...');
      const { data: baselineData, error: baselineError } = await supabase.functions.invoke('centralized-market-stream');
      
      if (baselineError) {
        console.error('❌ Failed to initialize FastForex baseline:', baselineError);
        return;
      }
      
      console.log('✅ FastForex baseline initialized:', baselineData);
      
      // Wait for baseline data to propagate
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Start real-time tick generation from FastForex baseline
      console.log('🎯 Starting FastForex-based tick generation...');
      const { data: tickData, error: tickError } = await supabase.functions.invoke('real-time-tick-generator');
      
      if (tickError) {
        console.error('❌ Failed to start FastForex ticks:', tickError);
        return;
      }
      
      console.log('✅ FastForex-powered real-time market system activated:', tickData);
      
    } catch (error) {
      console.error('💥 FastForex market activation error:', error);
    }
  }, []);

  // Auto-activation on system startup
  useEffect(() => {
    const activationTimer = setTimeout(() => {
      activateMarket();
    }, 800); // Slight delay for better UX
    
    return () => clearTimeout(activationTimer);
  }, [activateMarket]);

  return { activateMarket };
};
