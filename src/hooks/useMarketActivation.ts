
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMarketActivation = () => {
  const activateMarket = useCallback(async () => {
    try {
      console.log('🔄 Activating automated FastForex market system...');
      
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
        console.log('✅ Recent FastForex data found, automated system active');
        return;
      }
      
      // Initialize fresh FastForex baseline data for the automated system
      console.log('📊 Initializing automated FastForex baseline data...');
      const { data: baselineData, error: baselineError } = await supabase.functions.invoke('centralized-market-stream');
      
      if (baselineError) {
        console.error('❌ Failed to initialize automated FastForex baseline:', baselineError);
        return;
      }
      
      console.log('✅ Automated FastForex baseline initialized:', baselineData);
      
      // Wait for baseline data to propagate
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Start automated real-time tick generation from FastForex baseline
      console.log('🎯 Starting automated FastForex-based tick generation...');
      const { data: tickData, error: tickError } = await supabase.functions.invoke('real-time-tick-generator');
      
      if (tickError) {
        console.error('❌ Failed to start automated FastForex ticks:', tickError);
        return;
      }
      
      console.log('✅ Automated FastForex-powered real-time market system activated:', tickData);
      
    } catch (error) {
      console.error('💥 Automated FastForex market activation error:', error);
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
