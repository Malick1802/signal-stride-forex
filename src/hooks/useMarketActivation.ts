
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMarketActivation = () => {
  const activateMarket = useCallback(async () => {
    try {
      console.log('🔄 Activating centralized market system...');
      
      // First, ensure baseline data exists
      const { data: baselineData, error: baselineError } = await supabase.functions.invoke('centralized-market-stream');
      
      if (baselineError) {
        console.error('❌ Failed to initialize baseline data:', baselineError);
        return;
      }
      
      console.log('✅ Baseline data initialized:', baselineData);
      
      // Then trigger initial tick generation
      const { data: tickData, error: tickError } = await supabase.functions.invoke('real-time-tick-generator');
      
      if (tickError) {
        console.error('❌ Failed to generate initial ticks:', tickError);
        return;
      }
      
      console.log('✅ Initial ticks generated:', tickData);
      
    } catch (error) {
      console.error('💥 Market activation error:', error);
    }
  }, []);

  // Auto-activate on first load
  useEffect(() => {
    // Small delay to let components mount
    const timer = setTimeout(activateMarket, 1000);
    return () => clearTimeout(timer);
  }, [activateMarket]);

  return { activateMarket };
};
