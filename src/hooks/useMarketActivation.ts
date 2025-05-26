
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMarketActivation = () => {
  const activateMarket = useCallback(async () => {
    try {
      console.log('🔄 Activating centralized real-time market system...');
      
      // Check if we already have recent market data
      const { data: existingData, error: checkError } = await supabase
        .from('centralized_market_state')
        .select('last_update')
        .order('last_update', { ascending: false })
        .limit(1);
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const hasRecentData = existingData && existingData.length > 0 && 
        new Date(existingData[0].last_update) > fiveMinutesAgo;
      
      if (hasRecentData) {
        console.log('✅ Recent market data found, system already active');
        return;
      }
      
      // Initialize baseline data if needed
      console.log('📊 Initializing baseline market data...');
      const { data: baselineData, error: baselineError } = await supabase.functions.invoke('centralized-market-stream');
      
      if (baselineError) {
        console.error('❌ Failed to initialize baseline data:', baselineError);
        return;
      }
      
      console.log('✅ Baseline data initialized:', baselineData);
      
      // Wait a moment for baseline data to settle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Trigger initial tick generation to start the real-time flow
      console.log('🎯 Starting real-time tick generation...');
      const { data: tickData, error: tickError } = await supabase.functions.invoke('real-time-tick-generator');
      
      if (tickError) {
        console.error('❌ Failed to generate initial ticks:', tickError);
        return;
      }
      
      console.log('✅ Real-time market system activated:', tickData);
      
    } catch (error) {
      console.error('💥 Market activation error:', error);
    }
  }, []);

  // Enhanced auto-activation with better timing
  useEffect(() => {
    // Immediate check, then activate if needed
    const timer = setTimeout(() => {
      activateMarket();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [activateMarket]);

  return { activateMarket };
};
